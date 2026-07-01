
-- Sprint 6A: Make assignment_id and school_id nullable on training_executions
-- to support self-enrollment flows where no school assignment exists.
ALTER TABLE public.training_executions
  ALTER COLUMN assignment_id DROP NOT NULL;

ALTER TABLE public.training_executions
  ALTER COLUMN school_id DROP NOT NULL;

-- Update the auto_create_training_execution function to handle enrollment_id
CREATE OR REPLACE FUNCTION public.auto_create_training_execution()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status != 'cancelled' THEN
    INSERT INTO public.training_executions (
      assignment_id, school_id, teacher_id, training_item_id, training_item_type, execution_status
    ) VALUES (
      NEW.id, NEW.school_id, NEW.assigned_to_teacher_id, NEW.assigned_item_id, NEW.assigned_item_type, 'assigned'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Update validate_training_execution to allow null assignment for self-enrollment
CREATE OR REPLACE FUNCTION public.validate_training_execution()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  v_item_type text;
BEGIN
  SELECT type INTO v_item_type FROM public.training_items WHERE id = NEW.training_item_id;
  IF v_item_type IS NULL THEN
    RAISE EXCEPTION 'Training item does not exist: %', NEW.training_item_id;
  END IF;
  IF v_item_type NOT IN ('course', 'pathway') THEN
    RAISE EXCEPTION 'Cannot create execution for item type "%". Only course and pathway are executable.', v_item_type;
  END IF;
  IF NEW.training_item_type != v_item_type THEN
    RAISE EXCEPTION 'training_item_type "%" does not match actual type "%"', NEW.training_item_type, v_item_type;
  END IF;
  -- Must have either assignment_id or enrollment_id
  IF NEW.assignment_id IS NULL AND NEW.enrollment_id IS NULL THEN
    RAISE EXCEPTION 'Execution must have either assignment_id or enrollment_id';
  END IF;
  RETURN NEW;
END;
$function$;

-- Update auto_create_course_progress to handle nullable assignment_id
CREATE OR REPLACE FUNCTION public.auto_create_course_progress()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.training_item_type = 'course' AND NEW.execution_status != 'cancelled' THEN
    INSERT INTO public.course_progress (
      execution_id, assignment_id, school_id, teacher_id, course_id, progress_status
    ) VALUES (
      NEW.id, NEW.assignment_id, NEW.school_id, NEW.teacher_id, NEW.training_item_id, 'not_started'
    );
  END IF;
  RETURN NEW;
END;
$function$;
