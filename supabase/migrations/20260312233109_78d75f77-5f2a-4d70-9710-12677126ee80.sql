
-- Phase 4.4 — Hiring Signals Layer
-- Append-only table for observing successful hiring actions.

CREATE TABLE public.hiring_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL,
  actor_type text NOT NULL,
  actor_id uuid,
  teacher_id uuid,
  school_id uuid,
  job_id uuid,
  application_id uuid,
  interview_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for future querying
CREATE INDEX idx_hiring_signals_type ON public.hiring_signals (signal_type);
CREATE INDEX idx_hiring_signals_teacher ON public.hiring_signals (teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX idx_hiring_signals_job ON public.hiring_signals (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_hiring_signals_application ON public.hiring_signals (application_id) WHERE application_id IS NOT NULL;
CREATE INDEX idx_hiring_signals_created ON public.hiring_signals (created_at);

-- RLS
ALTER TABLE public.hiring_signals ENABLE ROW LEVEL SECURITY;

-- Admins can read all signals
CREATE POLICY "Admins can read all signals"
  ON public.hiring_signals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert signals
CREATE POLICY "Admins can insert signals"
  ON public.hiring_signals FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- School roles can insert signals for their actions
CREATE POLICY "School roles can insert signals"
  ON public.hiring_signals FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'school_recruiter')
  );

-- School roles can read signals related to their jobs
CREATE POLICY "School roles can read own signals"
  ON public.hiring_signals FOR SELECT
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'school_recruiter'))
    AND job_id IN (
      SELECT j.id FROM jobs j
      JOIN school_profiles sp ON j.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
  );

-- Teachers can insert signals for their own actions
CREATE POLICY "Teachers can insert own signals"
  ON public.hiring_signals FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
  );

-- Teachers can read their own signals
CREATE POLICY "Teachers can read own signals"
  ON public.hiring_signals FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT tp.id FROM teacher_profiles tp WHERE tp.user_id = auth.uid()
    )
  );
