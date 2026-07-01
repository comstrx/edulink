
-- ============================================================
-- Sprint B0-B: Ownership Wiring Migration
-- ============================================================

-- 1. Enums for training catalog ownership
CREATE TYPE public.catalog_ownership_type AS ENUM ('platform', 'provider');
CREATE TYPE public.catalog_review_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested');

-- 2. Extend training_items with provider ownership columns
ALTER TABLE public.training_items
  ADD COLUMN provider_id uuid REFERENCES public.providers(id),
  ADD COLUMN ownership_type public.catalog_ownership_type NOT NULL DEFAULT 'platform',
  ADD COLUMN review_status public.catalog_review_status NOT NULL DEFAULT 'approved',
  ADD COLUMN published_by_provider_at timestamptz,
  ADD COLUMN approved_by_admin_at timestamptz;

-- 3. Extend mentors with provider affiliation
ALTER TABLE public.mentors
  ADD COLUMN primary_provider_id uuid REFERENCES public.providers(id),
  ADD COLUMN is_independent boolean NOT NULL DEFAULT true;

-- 4. Extend earned_credentials with issuer provider reference
ALTER TABLE public.earned_credentials
  ADD COLUMN issuer_provider_id uuid REFERENCES public.providers(id);

-- 5. Indexes for query performance
CREATE INDEX training_items_provider_idx ON public.training_items(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX mentors_provider_idx ON public.mentors(primary_provider_id) WHERE primary_provider_id IS NOT NULL;
CREATE INDEX earned_credentials_issuer_provider_idx ON public.earned_credentials(issuer_provider_id) WHERE issuer_provider_id IS NOT NULL;

-- 6. Validation trigger: ownership_type consistency
CREATE OR REPLACE FUNCTION public.validate_training_item_ownership()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ownership_type = 'provider' AND NEW.provider_id IS NULL THEN
    RAISE EXCEPTION 'provider_id must not be null when ownership_type is provider';
  END IF;
  IF NEW.ownership_type = 'platform' AND NEW.provider_id IS NOT NULL THEN
    RAISE EXCEPTION 'provider_id must be null when ownership_type is platform';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_training_item_ownership
  BEFORE INSERT OR UPDATE ON public.training_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_training_item_ownership();

-- 7. Validation trigger: mentor affiliation consistency
CREATE OR REPLACE FUNCTION public.validate_mentor_affiliation()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_independent = true AND NEW.primary_provider_id IS NOT NULL THEN
    RAISE EXCEPTION 'primary_provider_id must be null when mentor is independent';
  END IF;
  IF NEW.is_independent = false AND NEW.primary_provider_id IS NULL THEN
    RAISE EXCEPTION 'primary_provider_id must not be null when mentor is not independent';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mentor_affiliation
  BEFORE INSERT OR UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.validate_mentor_affiliation();

-- 8. RLS: Provider members can read their own provider's training items
CREATE POLICY "provider_members_read_own_catalog"
  ON public.training_items FOR SELECT TO authenticated
  USING (
    provider_id IS NOT NULL
    AND provider_id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 9. RLS: Provider members can view mentors affiliated with their provider
CREATE POLICY "provider_members_read_affiliated_mentors"
  ON public.mentors FOR SELECT TO authenticated
  USING (
    primary_provider_id IS NOT NULL
    AND primary_provider_id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 10. RLS: Provider members can view credentials issued by their provider
CREATE POLICY "provider_members_read_issued_credentials"
  ON public.earned_credentials FOR SELECT TO authenticated
  USING (
    issuer_provider_id IS NOT NULL
    AND issuer_provider_id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 11. Backfill existing data (all existing rows are platform-owned)
-- training_items: defaults already set via column defaults (platform, approved, null provider_id)
-- mentors: defaults already set via column defaults (is_independent=true, primary_provider_id=null)
-- earned_credentials: new column is nullable, no backfill needed
