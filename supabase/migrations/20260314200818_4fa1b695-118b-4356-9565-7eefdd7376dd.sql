-- Create saved_jobs table
CREATE TABLE public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, job_id)
);

-- Indexes
CREATE INDEX saved_jobs_teacher_idx ON public.saved_jobs(teacher_id);
CREATE INDEX saved_jobs_job_idx ON public.saved_jobs(job_id);

-- RLS
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_read_saved_jobs"
  ON public.saved_jobs FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "teacher_insert_saved_jobs"
  ON public.saved_jobs FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "teacher_delete_saved_jobs"
  ON public.saved_jobs FOR DELETE TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));