-- Sprint 3: School Organization + Membership

-- 1. School Organizations table
CREATE TABLE public.school_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  plan text NOT NULL DEFAULT 'free',
  country_term_id uuid,
  school_type_term_id uuid,
  curriculum_term_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  onboarding_completed boolean NOT NULL DEFAULT false,
  legacy_school_profile_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Status validation trigger
CREATE OR REPLACE FUNCTION public.validate_school_org_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.status NOT IN ('active', 'pending', 'suspended', 'archived') THEN
    RAISE EXCEPTION 'Invalid school organization status';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_validate_school_org_status
  BEFORE INSERT OR UPDATE ON public.school_organizations
  FOR EACH ROW EXECUTE FUNCTION public.validate_school_org_status();

CREATE TRIGGER trg_school_org_updated_at
  BEFORE UPDATE ON public.school_organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. School Members table
CREATE TABLE public.school_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.school_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id, role_key)
);

-- Validate role_key is a school role
CREATE OR REPLACE FUNCTION public.validate_school_member_role()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.role_key NOT IN ('school_admin', 'school_recruiter', 'school_academic_lead', 'school_training_manager') THEN
    RAISE EXCEPTION 'Invalid school member role_key: only school roles allowed';
  END IF;
  IF NEW.status NOT IN ('active', 'invited', 'inactive') THEN
    RAISE EXCEPTION 'Invalid school member status';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_validate_school_member
  BEFORE INSERT OR UPDATE ON public.school_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_school_member_role();

CREATE TRIGGER trg_school_members_updated_at
  BEFORE UPDATE ON public.school_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RLS on school_organizations
ALTER TABLE public.school_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their school org"
  ON public.school_organizations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = id AND sm.user_id = auth.uid() AND sm.status = 'active'
    )
  );

CREATE POLICY "School admins can update their org"
  ON public.school_organizations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = id AND sm.user_id = auth.uid() AND sm.role_key = 'school_admin' AND sm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = id AND sm.user_id = auth.uid() AND sm.role_key = 'school_admin' AND sm.status = 'active'
    )
  );

-- 4. RLS on school_members
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memberships"
  ON public.school_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "School admins can read all school members"
  ON public.school_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members sm2
      WHERE sm2.school_id = school_id AND sm2.user_id = auth.uid() AND sm2.role_key = 'school_admin' AND sm2.status = 'active'
    )
  );

CREATE POLICY "School admins can insert members"
  ON public.school_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_members sm2
      WHERE sm2.school_id = school_id AND sm2.user_id = auth.uid() AND sm2.role_key = 'school_admin' AND sm2.status = 'active'
    )
    OR (user_id = auth.uid() AND public.has_role(auth.uid(), 'school_admin'))
  );

-- 5. Backfill: Create org for each school_profile, create membership for the owner
INSERT INTO public.school_organizations (name, plan, country_term_id, school_type_term_id, curriculum_term_ids, onboarding_completed, legacy_school_profile_id, status)
SELECT
  COALESCE(sp.name, 'Unnamed School'),
  sp.plan,
  sp.country_term_id,
  sp.school_type_term_id,
  sp.curriculum_term_ids,
  sp.onboarding_completed,
  sp.id,
  'active'
FROM public.school_profiles sp
WHERE NOT EXISTS (
  SELECT 1 FROM public.school_organizations so WHERE so.legacy_school_profile_id = sp.id
);

INSERT INTO public.school_members (school_id, user_id, role_key, status)
SELECT so.id, sp.user_id, 'school_admin', 'active'
FROM public.school_profiles sp
JOIN public.school_organizations so ON so.legacy_school_profile_id = sp.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.school_members sm WHERE sm.school_id = so.id AND sm.user_id = sp.user_id
);