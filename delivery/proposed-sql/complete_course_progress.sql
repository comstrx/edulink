-- ============================================================================
-- complete_course_progress — atomic course completion (fixes audit #3)
--
-- Replaces the sequential, non-transactional multi-write in the old
-- course-progress edge handler. Every write happens in ONE transaction: a
-- partial failure rolls the whole thing back, so state can never end up with a
-- completed course but an un-updated enrollment/execution.
--
-- Security (fixes audit #2): SECURITY DEFINER, but authorization is enforced
-- inside the function against auth.uid() — the caller's *verified* JWT — so no
-- service-role key is needed on the request path (least privilege). RLS on the
-- underlying tables is bypassed only after ownership is proven here.
--
-- Idempotent: the training_completions insert relies on the existing unique
-- index (teacher_id, source_type, source_id). `newly_completed` reports whether
-- this call actually created the completion.
--
-- Follows the repo's established pattern for transactional writes
-- (cf. complete_mentor_session_with_outcome, review_mentorship_evidence).
--
-- Apply via your own migration workflow (git/DB are yours). This file lives in
-- delivery/proposed-sql/ so it is NOT auto-picked-up by supabase/migrations.
--
-- ASSUMPTION to verify before applying: a UNIQUE constraint/index exists on
-- public.training_completions (teacher_id, source_type, source_id). The old
-- code comment asserts it; confirm the exact column order for the ON CONFLICT.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_course_progress(p_execution_id uuid)
RETURNS TABLE (course_id uuid, teacher_id uuid, newly_completed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id   uuid;
  v_exec         RECORD;
  v_cp           RECORD;
  v_enrollment_id uuid;
  v_now          timestamptz := now();
  v_newly        boolean := false;
BEGIN
  -- 1. Resolve the caller's teacher profile from the verified JWT.
  SELECT tp.id INTO v_teacher_id
  FROM public.teacher_profiles tp
  WHERE tp.user_id = auth.uid();

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: no teacher profile for caller';
  END IF;

  -- 2. Load + lock the execution; validate ownership and type.
  SELECT e.id, e.teacher_id, e.training_item_type, e.execution_status, e.assignment_id
    INTO v_exec
  FROM public.training_executions e
  WHERE e.id = p_execution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: execution not found';
  END IF;
  IF v_exec.teacher_id <> v_teacher_id THEN
    RAISE EXCEPTION 'FORBIDDEN: not your execution';
  END IF;
  IF v_exec.training_item_type <> 'course' THEN
    RAISE EXCEPTION 'INVALID_STATE: only course executions support course progress';
  END IF;
  IF v_exec.execution_status = 'cancelled' THEN
    RAISE EXCEPTION 'INVALID_STATE: cannot complete a cancelled execution';
  END IF;

  -- 3. Load + lock the course_progress row; validate the state transition.
  SELECT cp.id, cp.course_id, cp.progress_status
    INTO v_cp
  FROM public.course_progress cp
  WHERE cp.execution_id = p_execution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: course progress not found';
  END IF;
  IF v_cp.progress_status = 'completed' THEN
    RAISE EXCEPTION 'ALREADY_COMPLETED: course is already completed';
  END IF;
  IF v_cp.progress_status = 'not_started' THEN
    RAISE EXCEPTION 'INVALID_STATE: cannot complete a course that has not started';
  END IF;

  -- 4. Atomic writes ------------------------------------------------------
  UPDATE public.course_progress
     SET progress_status = 'completed',
         progress_percent = 100,
         completed_at     = v_now,
         last_activity_at = v_now
   WHERE id = v_cp.id;

  UPDATE public.training_executions
     SET execution_status = 'completed',
         completed_at      = v_now,
         last_activity_at  = v_now
   WHERE id = p_execution_id;

  IF v_exec.assignment_id IS NOT NULL THEN
    UPDATE public.training_assignments
       SET status = 'completed'
     WHERE id = v_exec.assignment_id;
  END IF;

  -- Complete a linked, still-open enrollment if one exists.
  SELECT en.id INTO v_enrollment_id
  FROM public.training_enrollments en
  WHERE en.teacher_id = v_teacher_id
    AND en.item_id   = v_cp.course_id
    AND en.status IN ('enrolled', 'active')
  LIMIT 1
  FOR UPDATE;

  IF v_enrollment_id IS NOT NULL THEN
    UPDATE public.training_enrollments
       SET status = 'completed', completed_at = v_now
     WHERE id = v_enrollment_id;
  END IF;

  -- Idempotent completion record (single source of truth for credentials).
  INSERT INTO public.training_completions
    (teacher_id, source_id, source_type, completed_at, completion_evidence)
  VALUES
    (v_teacher_id, v_cp.course_id, 'training_item', v_now,
     jsonb_build_object('type', 'course_progress_completed', 'execution_id', p_execution_id))
  ON CONFLICT (teacher_id, source_type, source_id) DO NOTHING;

  v_newly := FOUND; -- true only if a row was actually inserted

  RETURN QUERY SELECT v_cp.course_id, v_teacher_id, v_newly;
END;
$$;

-- Only authenticated callers may execute; the function itself enforces ownership.
REVOKE ALL ON FUNCTION public.complete_course_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_course_progress(uuid) TO authenticated;
