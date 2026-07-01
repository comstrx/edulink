
-- Sprint 6A: Make assignment_id and school_id nullable on course_progress
-- to support self-enrollment flows where no school assignment exists.
ALTER TABLE public.course_progress
  ALTER COLUMN assignment_id DROP NOT NULL;

ALTER TABLE public.course_progress
  ALTER COLUMN school_id DROP NOT NULL;

-- Update validate_course_progress to handle nullable assignment for self-enrollment
CREATE OR REPLACE FUNCTION public.validate_course_progress()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  v_exec record;
BEGIN
  SELECT assignment_id, school_id, teacher_id, training_item_id, training_item_type
    INTO v_exec
    FROM public.training_executions WHERE id = NEW.execution_id;

  IF v_exec IS NULL THEN
    RAISE EXCEPTION 'Execution % does not exist', NEW.execution_id;
  END IF;

  IF v_exec.training_item_type != 'course' THEN
    RAISE EXCEPTION 'Course progress only allowed for course executions, got "%".', v_exec.training_item_type;
  END IF;

  -- Validate context matches execution (allowing NULLs for self-enrollment)
  IF (NEW.assignment_id IS DISTINCT FROM v_exec.assignment_id)
     OR (NEW.school_id IS DISTINCT FROM v_exec.school_id)
     OR NEW.teacher_id != v_exec.teacher_id
     OR NEW.course_id != v_exec.training_item_id THEN
    RAISE EXCEPTION 'Course progress context must match execution context';
  END IF;

  RETURN NEW;
END;
$function$;
