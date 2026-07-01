
-- Update training_assignments RLS to include school_training_manager
DROP POLICY IF EXISTS "School roles can manage own training assignments" ON public.training_assignments;

CREATE POLICY "School roles can manage own training assignments"
  ON public.training_assignments FOR ALL TO authenticated
  USING (
    school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'school_training_manager'::app_role)
    )
  )
  WITH CHECK (
    school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'school_training_manager'::app_role)
    )
  );

-- Update school_team_members policies
DROP POLICY IF EXISTS "School admins can insert own team" ON public.school_team_members;
DROP POLICY IF EXISTS "School admins can delete own team" ON public.school_team_members;

CREATE POLICY "School managers can insert own team"
  ON public.school_team_members FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'school_training_manager'::app_role)
    )
  );

CREATE POLICY "School managers can delete own team"
  ON public.school_team_members FOR DELETE TO authenticated
  USING (
    school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'school_training_manager'::app_role)
    )
  );
