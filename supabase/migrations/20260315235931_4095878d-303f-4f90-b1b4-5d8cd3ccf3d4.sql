
-- 1. Add outcome columns to mentor_sessions
ALTER TABLE public.mentor_sessions
  ADD COLUMN IF NOT EXISTS mentor_summary text,
  ADD COLUMN IF NOT EXISTS teacher_reflection text,
  ADD COLUMN IF NOT EXISTS session_outcome text,
  ADD COLUMN IF NOT EXISTS recommended_next_step text,
  ADD COLUMN IF NOT EXISTS competency_term_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_submitted boolean DEFAULT false;

-- 2. Validate session_outcome values
CREATE OR REPLACE FUNCTION public.validate_session_outcome()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.session_outcome IS NOT NULL AND NEW.session_outcome NOT IN (
    'guidance_session', 'skill_feedback', 'lesson_review',
    'career_advice', 'practice_coaching', 'remediation_support'
  ) THEN
    RAISE EXCEPTION 'Invalid session_outcome: %', NEW.session_outcome;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_session_outcome
  BEFORE INSERT OR UPDATE ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_session_outcome();

-- 3. Create mentor_session_evidence table
CREATE TABLE public.mentor_session_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reflection_text text,
  evidence_url text,
  evidence_type text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_by uuid REFERENCES public.mentors(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Validate evidence_type
CREATE OR REPLACE FUNCTION public.validate_mentorship_evidence()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.evidence_type NOT IN (
    'lesson_plan', 'classroom_video', 'teaching_artifact',
    'student_work', 'reflection_document'
  ) THEN
    RAISE EXCEPTION 'Invalid mentorship evidence_type: %', NEW.evidence_type;
  END IF;

  IF NEW.status NOT IN ('submitted', 'under_review', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid mentorship evidence status: %', NEW.status;
  END IF;

  -- Validate status transitions on update
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'submitted' AND NEW.status IN ('under_review', 'approved', 'rejected')) OR
      (OLD.status = 'under_review' AND NEW.status IN ('approved', 'rejected')) OR
      (OLD.status = 'rejected' AND NEW.status = 'submitted')
    ) THEN
      RAISE EXCEPTION 'Invalid mentorship evidence status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  -- Ensure session is completed
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mentor_sessions
      WHERE id = NEW.session_id AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Can only submit evidence for completed sessions';
    END IF;

    -- Ensure teacher matches session
    IF NOT EXISTS (
      SELECT 1 FROM public.mentor_sessions
      WHERE id = NEW.session_id AND teacher_id = NEW.teacher_id
    ) THEN
      RAISE EXCEPTION 'Teacher does not match session';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_mentorship_evidence
  BEFORE INSERT OR UPDATE ON public.mentor_session_evidence
  FOR EACH ROW EXECUTE FUNCTION public.validate_mentorship_evidence();

-- 5. Auto-update evidence_submitted flag on mentor_sessions
CREATE OR REPLACE FUNCTION public.update_session_evidence_flag()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.mentor_sessions
    SET evidence_submitted = true
    WHERE id = NEW.session_id AND evidence_submitted = false;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_update_session_evidence_flag
  AFTER INSERT ON public.mentor_session_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_session_evidence_flag();

-- 6. updated_at trigger
CREATE TRIGGER trg_mentor_session_evidence_updated_at
  BEFORE UPDATE ON public.mentor_session_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS
ALTER TABLE public.mentor_session_evidence ENABLE ROW LEVEL SECURITY;

-- Teachers can view and insert their own evidence
CREATE POLICY "Teachers can view own evidence"
  ON public.mentor_session_evidence FOR SELECT
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can insert own evidence"
  ON public.mentor_session_evidence FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ));

-- Mentors can view evidence for their sessions
CREATE POLICY "Mentors can view session evidence"
  ON public.mentor_session_evidence FOR SELECT
  TO authenticated
  USING (session_id IN (
    SELECT ms.id FROM public.mentor_sessions ms
    JOIN public.mentors m ON m.id = ms.mentor_id
    WHERE m.user_id = auth.uid()
  ));

-- Mentors can update evidence (for review)
CREATE POLICY "Mentors can review evidence"
  ON public.mentor_session_evidence FOR UPDATE
  TO authenticated
  USING (session_id IN (
    SELECT ms.id FROM public.mentor_sessions ms
    JOIN public.mentors m ON m.id = ms.mentor_id
    WHERE m.user_id = auth.uid()
  ));

-- Admins full access
CREATE POLICY "Admins full access to mentorship evidence"
  ON public.mentor_session_evidence FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Indexes
CREATE INDEX idx_mentor_session_evidence_session ON public.mentor_session_evidence(session_id);
CREATE INDEX idx_mentor_session_evidence_teacher ON public.mentor_session_evidence(teacher_id);
CREATE INDEX idx_mentor_session_evidence_status ON public.mentor_session_evidence(status);
