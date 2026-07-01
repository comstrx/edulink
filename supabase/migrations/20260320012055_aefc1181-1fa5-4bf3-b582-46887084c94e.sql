
-- Auto-provision entitlements when a provider is activated (status → 'active')
-- Mirrors trg_auto_provision_school_entitlements for school parity.

CREATE OR REPLACE FUNCTION public.auto_provision_provider_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status transitions to 'active'
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN

    -- 1. Account entitlement: provider_portal for the owner user
    INSERT INTO public.account_entitlements (
      user_id, module_key, enabled, source_type, source_ref
    ) VALUES (
      NEW.created_by, 'provider_portal', true, 'system', 'provider_activation'
    )
    ON CONFLICT (user_id, module_key) DO NOTHING;

    -- 2. Organization entitlements for the provider org
    INSERT INTO public.organization_entitlements (
      organization_type, organization_id, module_key, enabled, source_type, source_ref
    ) VALUES
      ('provider', NEW.id, 'provider_portal', true, 'system', 'provider_activation'),
      ('provider', NEW.id, 'training',        true, 'system', 'provider_activation'),
      ('provider', NEW.id, 'mentorship',      true, 'system', 'provider_activation'),
      ('provider', NEW.id, 'credentials',     true, 'system', 'provider_activation')
    ON CONFLICT (organization_type, organization_id, module_key) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to providers table
CREATE TRIGGER trg_auto_provision_provider_entitlements
  AFTER UPDATE ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_provider_entitlements();
