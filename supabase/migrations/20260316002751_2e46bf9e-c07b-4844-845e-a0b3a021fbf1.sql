
-- 1) Fix competency_term_ids validation: remove 'subjects' from allowed vocabularies
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

      IF v_vocab NOT IN ('skills', 'competency-domains') THEN
        RAISE EXCEPTION 'competency_term_ids term % belongs to vocabulary "%" — only skills and competency-domains allowed', term_id, v_vocab;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Create RPC for controlled mentor evidence review
CREATE OR REPLACE FUNCTION public.review_mentorship_evidence(
  p_evidence_id uuid,
  p_mentor_user_id uuid,
  p_decision text,
  p_review_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mentor_id uuid;
  v_evidence record;
  v_session record;
  v_result jsonb;
BEGIN
  -- Validate decision
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision: %. Must be approved or rejected.', p_decision;
  END IF;

  -- Reject requires notes
  IF p_decision = 'rejected' AND (p_review_notes IS NULL OR trim(p_review_notes) = '') THEN
    RAISE EXCEPTION 'Review notes are required when rejecting evidence';
  END IF;

  -- Resolve active mentor
  SELECT id INTO v_mentor_id FROM public.mentors
    WHERE user_id = p_mentor_user_id AND status = 'active';
  IF v_mentor_id IS NULL THEN
    RAISE EXCEPTION 'Not an active mentor';
  END IF;

  -- Lock and fetch evidence
  SELECT id, session_id, teacher_id, status, evidence_type
    INTO v_evidence
    FROM public.mentor_session_evidence
    WHERE id = p_evidence_id
    FOR UPDATE;

  IF v_evidence IS NULL THEN
    RAISE EXCEPTION 'Evidence not found';
  END IF;

  -- Validate status transition
  IF v_evidence.status != 'submitted' THEN
    RAISE EXCEPTION 'Evidence must be in submitted status to review, current: %', v_evidence.status;
  END IF;

  -- Verify session belongs to this mentor
  SELECT id, mentor_id, teacher_id, competency_term_ids
    INTO v_session
    FROM public.mentor_sessions
    WHERE id = v_evidence.session_id;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Associated session not found';
  END IF;

  IF v_session.mentor_id != v_mentor_id THEN
    RAISE EXCEPTION 'Evidence does not belong to a session owned by this mentor';
  END IF;

  -- Update only review fields
  UPDATE public.mentor_session_evidence SET
    status = p_decision,
    reviewed_by_mentor_id = v_mentor_id,
    reviewed_at = now(),
    review_notes = p_review_notes
  WHERE id = p_evidence_id;

  -- Return event payload
  v_result := jsonb_build_object(
    'evidenceId', v_evidence.id,
    'sessionId', v_evidence.session_id,
    'teacherId', v_evidence.teacher_id,
    'mentorId', v_mentor_id,
    'decision', p_decision,
    'competencyTermIds', COALESCE(to_jsonb(v_session.competency_term_ids), '[]'::jsonb)
  );

  RETURN v_result;
END;
$function$;
