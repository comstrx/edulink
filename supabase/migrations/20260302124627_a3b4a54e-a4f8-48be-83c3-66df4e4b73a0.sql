
CREATE TABLE public.school_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id uuid NOT NULL,
  school_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (teacher_user_id, school_id)
);

ALTER TABLE public.school_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read own follows"
  ON public.school_follows FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_user_id);

CREATE POLICY "Teachers can insert own follows"
  ON public.school_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_user_id AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can delete own follows"
  ON public.school_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_user_id AND public.has_role(auth.uid(), 'teacher'));
