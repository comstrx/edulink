
-- Auto-provision default org entitlements when school onboarding completes
CREATE OR REPLACE FUNCTION public.auto_provision_school_entitlements()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when onboarding_completed transitions from false/null to true
  IF NEW.onboarding_completed = true
     AND (OLD.onboarding_completed IS DISTINCT FROM true)
  THEN
    -- Provision hiring (idempotent via ON CONFLICT)
    INSERT INTO public.organization_entitlements (
      organization_type, organization_id, module_key, enabled, source_type, source_ref
    ) VALUES (
      'school', NEW.id, 'hiring', true, 'system', 'onboarding_completion'
    )
    ON CONFLICT (organization_type, organization_id, module_key) DO NOTHING;

    -- Provision training
    INSERT INTO public.organization_entitlements (
      organization_type, organization_id, module_key, enabled, source_type, source_ref
    ) VALUES (
      'school', NEW.id, 'training', true, 'system', 'onboarding_completion'
    )
    ON CONFLICT (organization_type, organization_id, module_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to school_organizations
CREATE TRIGGER trg_auto_provision_school_entitlements
  AFTER UPDATE ON public.school_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_school_entitlements();

-- Add unique constraint for idempotency (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_org_entitlement_module'
  ) THEN
    ALTER TABLE public.organization_entitlements
      ADD CONSTRAINT uq_org_entitlement_module
      UNIQUE (organization_type, organization_id, module_key);
  END IF;
END;
$$;
