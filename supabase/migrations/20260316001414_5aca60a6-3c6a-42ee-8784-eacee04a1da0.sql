
-- ============================================================
-- Mentorship Outcome Model — Hardening Pass Migration
-- ============================================================

-- 1. Rename reviewed_by → reviewed_by_mentor_id with FK
ALTER TABLE public.mentor_session_evidence
  RENAME COLUMN reviewed_by TO reviewed_by_mentor_id;

ALTER TABLE public.mentor_session_evidence
  ADD CONSTRAINT mentor_session_evidence_reviewed_by_mentor_id_fkey
  FOREIGN KEY (reviewed_by_mentor_id) REFERENCES public.mentors(id);

-- 2. Remove under_review from allowed statuses in validation trigger
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

  -- Simplified lifecycle: submitted → approved | rejected (no under_review)
  IF NEW.status NOT IN ('submitted', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid mentorship evidence status: %', NEW.status;
  END IF;

  -- Validate status transitions on update
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'submitted' AND NEW.status IN ('approved', 'rejected')) OR
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

-- 3. Add trigger to restrict mentor updates to review fields only
CREATE OR REPLACE FUNCTION public.restrict_mentor_evidence_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  -- If a mentor is updating (reviewed_by_mentor_id is being set), 
  -- ensure teacher-submitted fields are NOT modified
  IF NEW.reviewed_by_mentor_id IS NOT NULL AND (TG_OP = 'UPDATE') THEN
    IF OLD.teacher_id IS DISTINCT FROM NEW.teacher_id THEN
      RAISE EXCEPTION 'Cannot modify teacher_id during review';
    END IF;
    IF OLD.session_id IS DISTINCT FROM NEW.session_id THEN
      RAISE EXCEPTION 'Cannot modify session_id during review';
    END IF;
    IF OLD.reflection_text IS DISTINCT FROM NEW.reflection_text THEN
      RAISE EXCEPTION 'Cannot modify reflection_text during review';
    END IF;
    IF OLD.evidence_url IS DISTINCT FROM NEW.evidence_url THEN
      RAISE EXCEPTION 'Cannot modify evidence_url during review';
    END IF;
    IF OLD.evidence_type IS DISTINCT FROM NEW.evidence_type THEN
      RAISE EXCEPTION 'Cannot modify evidence_type during review';
    END IF;
    IF OLD.submitted_at IS DISTINCT FROM NEW.submitted_at THEN
      RAISE EXCEPTION 'Cannot modify submitted_at during review';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_restrict_mentor_evidence_update
  BEFORE UPDATE ON public.mentor_session_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_mentor_evidence_update();

-- 4. Add trigger to validate competency_term_ids against taxonomy
CREATE OR REPLACE FUNCTION public.validate_competency_term_ids()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  term_id uuid;
  v_vocab text;
BEGIN
  IF NEW.competency_term_ids IS NOT NULL AND array_length(NEW.competency_term_ids, 1) > 0 THEN
    FOREACH term_id IN ARRAY NEW.competency_term_ids LOOP
      SELECT tv.slug INTO v_vocab
        FROM public.taxonomy_terms tt
        JOIN public.taxonomy_vocabularies tv ON tv.id = tt.vocabulary_id
        WHERE tt.id = term_id AND tt.is_active = true;

      IF v_vocab IS NULL THEN
        RAISE EXCEPTION 'competency_term_ids contains invalid or inactive term: %', term_id;
      END IF;

      IF v_vocab NOT IN ('skills', 'competency-domains', 'subjects') THEN
        RAISE EXCEPTION 'competency_term_ids term % belongs to vocabulary "%" — only skills, competency-domains, subjects allowed', term_id, v_vocab;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_competency_term_ids
  BEFORE INSERT OR UPDATE ON public.mentor_sessions
  FOR EACH ROW
  WHEN (NEW.competency_term_ids IS NOT NULL)
  EXECUTE FUNCTION public.validate_competency_term_ids();

-- 5. Create atomic session completion function
CREATE OR REPLACE FUNCTION public.complete_mentor_session_with_outcome(
  p_session_id uuid,
  p_mentor_user_id uuid,
  p_session_outcome text,
  p_mentor_summary text,
  p_recommended_next_step text DEFAULT NULL,
  p_competency_term_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session record;
  v_mentor_id uuid;
  v_result jsonb;
BEGIN
  -- Resolve mentor
  SELECT id INTO v_mentor_id FROM public.mentors
    WHERE user_id = p_mentor_user_id AND status = 'active';
  IF v_mentor_id IS NULL THEN
    RAISE EXCEPTION 'Not an active mentor';
  END IF;

  -- Lock and fetch session
  SELECT id, mentor_id, teacher_id, duration_minutes, training_execution_id, status
    INTO v_session
    FROM public.mentor_sessions
    WHERE id = p_session_id
    FOR UPDATE;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.mentor_id != v_mentor_id THEN
    RAISE EXCEPTION 'Not your session';
  END IF;

  IF v_session.status != 'confirmed' THEN
    RAISE EXCEPTION 'Session must be in confirmed status to complete, current: %', v_session.status;
  END IF;

  -- Atomic update: outcome fields + status in one operation
  UPDATE public.mentor_sessions SET
    session_outcome = p_session_outcome,
    mentor_summary = p_mentor_summary,
    recommended_next_step = p_recommended_next_step,
    competency_term_ids = p_competency_term_ids,
    status = 'completed'
  WHERE id = p_session_id;

  -- Return event payload data
  v_result := jsonb_build_object(
    'sessionId', v_session.id,
    'mentorId', v_mentor_id,
    'teacherId', v_session.teacher_id,
    'durationMinutes', v_session.duration_minutes,
    'trainingExecutionId', v_session.training_execution_id,
    'sessionOutcome', p_session_outcome
  );

  RETURN v_result;
END;
$function$;
