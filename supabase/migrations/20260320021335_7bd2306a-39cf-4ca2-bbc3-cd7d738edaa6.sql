
-- Helper: check if user is an active school member with a given role
CREATE OR REPLACE FUNCTION public.is_school_member(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id
      AND school_id = _school_id
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin_of(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id
      AND school_id = _school_id
      AND role_key = 'school_admin'
      AND status = 'active'
  )
$$;

-- Helper: check if user is an active provider member
CREATE OR REPLACE FUNCTION public.is_provider_member(_user_id uuid, _provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.provider_members
    WHERE user_id = _user_id
      AND provider_id = _provider_id
      AND status = 'active'
  )
$$;

-- Helper: get provider_ids for a user
CREATE OR REPLACE FUNCTION public.get_user_provider_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT provider_id FROM public.provider_members
  WHERE user_id = _user_id AND status = 'active'
$$;

-- ============================================
-- Fix school_members policies
-- ============================================

DROP POLICY IF EXISTS "School admins can read all school members" ON public.school_members;
CREATE POLICY "School admins can read all school members"
  ON public.school_members FOR SELECT
  USING (
    public.is_school_admin_of(auth.uid(), school_id)
  );

DROP POLICY IF EXISTS "School admins can insert members" ON public.school_members;
CREATE POLICY "School admins can insert members"
  ON public.school_members FOR INSERT
  WITH CHECK (
    public.is_school_admin_of(auth.uid(), school_id)
    OR (user_id = auth.uid() AND has_role(auth.uid(), 'school_admin'::app_role))
  );

-- "Users can read own memberships" is fine (user_id = auth.uid()), keep it.

-- ============================================
-- Fix provider_members policies
-- ============================================

DROP POLICY IF EXISTS "members_read_own_provider_members" ON public.provider_members;
CREATE POLICY "members_read_own_provider_members"
  ON public.provider_members FOR SELECT
  USING (
    public.is_provider_member(auth.uid(), provider_id)
  );

-- "self_read_own_membership" is fine (user_id = auth.uid()), keep it.

-- ============================================
-- Fix mentors policy that queries provider_members
-- ============================================

DROP POLICY IF EXISTS "provider_members_read_affiliated_mentors" ON public.mentors;
CREATE POLICY "provider_members_read_affiliated_mentors"
  ON public.mentors FOR SELECT
  USING (
    primary_provider_id IS NOT NULL
    AND primary_provider_id IN (SELECT public.get_user_provider_ids(auth.uid()))
  );
