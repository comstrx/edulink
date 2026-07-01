
-- Fix broken RLS policy on school_organizations (SELECT)
-- Bug: sm.school_id = sm.id (self-referencing) should be sm.school_id = school_organizations.id
DROP POLICY IF EXISTS "Members can read their school org" ON public.school_organizations;
CREATE POLICY "Members can read their school org"
  ON public.school_organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = school_organizations.id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

-- Fix broken RLS policy on school_organizations (UPDATE)
DROP POLICY IF EXISTS "School admins can update their org" ON public.school_organizations;
CREATE POLICY "School admins can update their org"
  ON public.school_organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = school_organizations.id
        AND sm.user_id = auth.uid()
        AND sm.role_key = 'school_admin'
        AND sm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = school_organizations.id
        AND sm.user_id = auth.uid()
        AND sm.role_key = 'school_admin'
        AND sm.status = 'active'
    )
  );

-- Fix broken RLS policy on school_members (admin SELECT)
-- Bug: sm2.school_id = sm2.school_id (always true)
DROP POLICY IF EXISTS "School admins can read all school members" ON public.school_members;
CREATE POLICY "School admins can read all school members"
  ON public.school_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members sm2
      WHERE sm2.school_id = school_members.school_id
        AND sm2.user_id = auth.uid()
        AND sm2.role_key = 'school_admin'
        AND sm2.status = 'active'
    )
  );

-- Fix broken RLS policy on school_members (admin INSERT)
DROP POLICY IF EXISTS "School admins can insert members" ON public.school_members;
CREATE POLICY "School admins can insert members"
  ON public.school_members
  FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM public.school_members sm2
      WHERE sm2.school_id = school_members.school_id
        AND sm2.user_id = auth.uid()
        AND sm2.role_key = 'school_admin'
        AND sm2.status = 'active'
    ))
    OR
    (user_id = auth.uid() AND has_role(auth.uid(), 'school_admin'::app_role))
  );
