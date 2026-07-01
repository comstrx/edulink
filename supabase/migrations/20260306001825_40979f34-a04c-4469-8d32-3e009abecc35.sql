
-- Applications table
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied',
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, teacher_id)
);

-- Indexes
CREATE INDEX idx_applications_teacher_id ON public.applications(teacher_id);
CREATE INDEX idx_applications_job_id ON public.applications(job_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_applications_created_at ON public.applications(created_at DESC);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_application_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('applied', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid application status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_application_status
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_application_status();

-- Updated_at trigger
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Teacher can read own applications
CREATE POLICY "Teachers can read own applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

-- Teacher can insert own application
CREATE POLICY "Teachers can insert own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'teacher')
  );

-- Teacher can update own applications (status only)
CREATE POLICY "Teachers can update own applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'teacher')
  );

-- Admin full access
CREATE POLICY "Admins can manage all applications"
  ON public.applications FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
