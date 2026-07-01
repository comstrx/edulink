
-- Phase 4.3A: Fix application status validation to support pipeline stages
CREATE OR REPLACE FUNCTION public.validate_application_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('applied', 'shortlisted', 'interview', 'offer', 'hired', 'withdrawn', 'rejected') THEN
    RAISE EXCEPTION 'Invalid application status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create interviews table
CREATE TABLE public.interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  scheduled_at timestamp with time zone NOT NULL,
  meeting_link text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Status validation trigger
CREATE OR REPLACE FUNCTION public.validate_interview_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('scheduled', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid interview status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_interview_status_trigger
  BEFORE INSERT OR UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_interview_status();

-- updated_at trigger
CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_interviews_application_id ON public.interviews(application_id);
CREATE INDEX idx_interviews_teacher_id ON public.interviews(teacher_id);
CREATE INDEX idx_interviews_job_id ON public.interviews(job_id);
CREATE INDEX idx_interviews_scheduled_at ON public.interviews(scheduled_at);
CREATE INDEX idx_interviews_status ON public.interviews(status) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- RLS: School roles can manage interviews on their own jobs
CREATE POLICY "School roles can manage interviews on own jobs"
  ON public.interviews FOR ALL
  TO authenticated
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN school_profiles sp ON j.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter'))
  )
  WITH CHECK (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN school_profiles sp ON j.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter'))
  );

-- RLS: Teachers can read their own interviews
CREATE POLICY "Teachers can read own interviews"
  ON public.interviews FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp WHERE tp.user_id = auth.uid()
    )
  );

-- RLS: Admins can manage all interviews
CREATE POLICY "Admins can manage all interviews"
  ON public.interviews FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
