
CREATE TABLE public.saved_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_user_id uuid NOT NULL,
  teacher_profile_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_user_id, teacher_profile_id)
);

ALTER TABLE public.saved_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School roles can insert own saves"
  ON public.saved_candidates FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = school_user_id
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'school_recruiter'::app_role)
    )
  );

CREATE POLICY "School roles can read own saves"
  ON public.saved_candidates FOR SELECT TO authenticated
  USING (auth.uid() = school_user_id);

CREATE POLICY "School roles can delete own saves"
  ON public.saved_candidates FOR DELETE TO authenticated
  USING (
    auth.uid() = school_user_id
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'school_recruiter'::app_role)
    )
  );

CREATE POLICY "Admins can manage all saves"
  ON public.saved_candidates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
