
-- ============================================================
-- Sprint B0-C: Governance Layer Migration
-- ============================================================

-- 1. Provider lifecycle transition enforcement trigger
CREATE OR REPLACE FUNCTION public.validate_provider_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'pending_review') OR
      (OLD.status = 'pending_review' AND NEW.status IN ('active', 'rejected')) OR
      (OLD.status = 'active' AND NEW.status IN ('suspended', 'inactive')) OR
      (OLD.status = 'suspended' AND NEW.status = 'active') OR
      (OLD.status = 'inactive' AND NEW.status = 'active') OR
      (OLD.status = 'rejected' AND NEW.status IN ('draft', 'pending_review'))
    ) THEN
      RAISE EXCEPTION 'Invalid provider status transition: % -> %', OLD.status, NEW.status;
    END IF;

    -- Set approved_by / approved_at on activation
    IF NEW.status = 'active' AND OLD.status IN ('pending_review', 'suspended', 'inactive') THEN
      NEW.approved_at = now();
      -- approved_by must be set by the caller
    END IF;

    -- Clear approval fields on non-active transitions
    IF NEW.status IN ('rejected', 'suspended', 'inactive') THEN
      NULL; -- keep approved_by/approved_at for audit trail
    END IF;

    -- Require rejection_reason when rejecting
    IF NEW.status = 'rejected' AND (NEW.rejection_reason IS NULL OR NEW.rejection_reason = '') THEN
      RAISE EXCEPTION 'rejection_reason is required when rejecting a provider';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_provider_status_transition
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.validate_provider_status_transition();

-- 2. Catalog review status transition enforcement for provider-owned items
CREATE OR REPLACE FUNCTION public.validate_catalog_review_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  -- Only enforce for provider-owned items
  IF NEW.ownership_type = 'provider' AND TG_OP = 'UPDATE' AND OLD.review_status IS DISTINCT FROM NEW.review_status THEN
    IF NOT (
      (OLD.review_status = 'draft' AND NEW.review_status = 'pending_review') OR
      (OLD.review_status = 'pending_review' AND NEW.review_status IN ('approved', 'rejected', 'changes_requested')) OR
      (OLD.review_status = 'changes_requested' AND NEW.review_status = 'draft') OR
      (OLD.review_status = 'rejected' AND NEW.review_status = 'draft')
    ) THEN
      RAISE EXCEPTION 'Invalid catalog review transition: % -> %', OLD.review_status, NEW.review_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_catalog_review_transition
  BEFORE UPDATE ON public.training_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_catalog_review_transition();

-- 3. Prevent provider members from self-approving their own items
-- (approval actions should only come from admins, enforced via RLS + app logic)

-- 4. RLS: Admin full access to providers (ensure exists)
-- Drop existing if conflicts, then recreate
DO $$
BEGIN
  -- Add update/delete policies for admin on providers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_manage_providers' AND tablename = 'providers') THEN
    EXECUTE 'CREATE POLICY "admin_manage_providers" ON public.providers FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- 5. RLS: Provider members can update their own provider (limited - for submit actions)
CREATE POLICY "provider_members_update_own_provider"
  ON public.providers FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

-- 6. RLS: Provider members can insert training items for their provider
CREATE POLICY "provider_members_insert_own_catalog"
  ON public.training_items FOR INSERT TO authenticated
  WITH CHECK (
    ownership_type = 'provider'
    AND provider_id IS NOT NULL
    AND provider_id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND review_status = 'draft'
  );

-- 7. RLS: Provider members can update their own provider's draft/changes_requested items
CREATE POLICY "provider_members_update_own_catalog"
  ON public.training_items FOR UPDATE TO authenticated
  USING (
    ownership_type = 'provider'
    AND provider_id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND review_status IN ('draft', 'changes_requested')
  )
  WITH CHECK (
    ownership_type = 'provider'
    AND provider_id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 8. Helper function: check if a training item is publicly visible
CREATE OR REPLACE FUNCTION public.is_training_item_publicly_visible(item_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.training_items ti
    WHERE ti.id = item_id
      AND ti.is_active = true
      AND ti.status = 'published'
      AND (
        ti.ownership_type = 'platform'
        OR (
          ti.ownership_type = 'provider'
          AND ti.review_status = 'approved'
          AND EXISTS (
            SELECT 1 FROM public.providers p
            WHERE p.id = ti.provider_id AND p.status = 'active'
          )
        )
      )
  )
$$;
