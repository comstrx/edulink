
-- Organization Entitlements
CREATE TABLE public.organization_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_type text NOT NULL,
  organization_id uuid NOT NULL,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  source_type text NOT NULL DEFAULT 'manual',
  source_ref text,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_type, organization_id, module_key)
);

-- Account Entitlements
CREATE TABLE public.account_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  source_type text NOT NULL DEFAULT 'manual',
  source_ref text,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, module_key)
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_org_entitlement()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.organization_type NOT IN ('school', 'provider') THEN
    RAISE EXCEPTION 'Invalid organization_type: %', NEW.organization_type;
  END IF;
  IF NEW.module_key NOT IN ('hiring', 'training', 'mentorship', 'credentials', 'provider_portal', 'talent_pool') THEN
    RAISE EXCEPTION 'Invalid org module_key: %', NEW.module_key;
  END IF;
  IF NEW.source_type NOT IN ('manual', 'plan', 'migration', 'system') THEN
    RAISE EXCEPTION 'Invalid source_type: %', NEW.source_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_org_entitlement
  BEFORE INSERT OR UPDATE ON public.organization_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.validate_org_entitlement();

CREATE OR REPLACE FUNCTION public.validate_account_entitlement()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.module_key NOT IN ('teacher_app', 'mentor_workspace', 'provider_portal', 'admin_console') THEN
    RAISE EXCEPTION 'Invalid account module_key: %', NEW.module_key;
  END IF;
  IF NEW.source_type NOT IN ('manual', 'role', 'migration', 'system') THEN
    RAISE EXCEPTION 'Invalid source_type: %', NEW.source_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_account_entitlement
  BEFORE INSERT OR UPDATE ON public.account_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.validate_account_entitlement();

-- Updated_at triggers
CREATE TRIGGER set_updated_at_org_entitlements
  BEFORE UPDATE ON public.organization_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_account_entitlements
  BEFORE UPDATE ON public.account_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_entitlements ENABLE ROW LEVEL SECURITY;

-- Account entitlements: users can read their own
CREATE POLICY "Users can read own account entitlements"
  ON public.account_entitlements FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Org entitlements: users can read entitlements for orgs they belong to (school)
CREATE POLICY "School members can read org entitlements"
  ON public.organization_entitlements FOR SELECT TO authenticated
  USING (
    (organization_type = 'school' AND EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = organization_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    ))
    OR
    (organization_type = 'provider' AND EXISTS (
      SELECT 1 FROM public.provider_members pm
      WHERE pm.provider_id = organization_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    ))
    OR
    public.has_role(auth.uid(), 'admin')
  );

-- Admin can manage all entitlements
CREATE POLICY "Admins can manage org entitlements"
  ON public.organization_entitlements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage account entitlements"
  ON public.account_entitlements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backfill: schools get hiring + training
INSERT INTO public.organization_entitlements (organization_type, organization_id, module_key, source_type)
SELECT 'school', id, 'hiring', 'migration' FROM public.school_organizations
ON CONFLICT DO NOTHING;

INSERT INTO public.organization_entitlements (organization_type, organization_id, module_key, source_type)
SELECT 'school', id, 'training', 'migration' FROM public.school_organizations
ON CONFLICT DO NOTHING;

-- Backfill: providers get provider_portal
INSERT INTO public.organization_entitlements (organization_type, organization_id, module_key, source_type)
SELECT 'provider', id, 'provider_portal', 'migration' FROM public.providers
ON CONFLICT DO NOTHING;

-- Backfill: teachers get teacher_app
INSERT INTO public.account_entitlements (user_id, module_key, source_type)
SELECT ur.user_id, 'teacher_app', 'migration'
FROM public.user_roles ur WHERE ur.role = 'teacher'
ON CONFLICT DO NOTHING;

-- Backfill: active mentors get mentor_workspace
INSERT INTO public.account_entitlements (user_id, module_key, source_type)
SELECT m.user_id, 'mentor_workspace', 'migration'
FROM public.mentors m WHERE m.status = 'active'
ON CONFLICT DO NOTHING;

-- Backfill: admins get admin_console
INSERT INTO public.account_entitlements (user_id, module_key, source_type)
SELECT ur.user_id, 'admin_console', 'migration'
FROM public.user_roles ur WHERE ur.role = 'admin'
ON CONFLICT DO NOTHING;

-- Backfill: providers get provider_portal account entitlement
INSERT INTO public.account_entitlements (user_id, module_key, source_type)
SELECT ur.user_id, 'provider_portal', 'migration'
FROM public.user_roles ur WHERE ur.role = 'provider'
ON CONFLICT DO NOTHING;
