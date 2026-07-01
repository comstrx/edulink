-- 1. Expand training item type validator to accept library/resource types
CREATE OR REPLACE FUNCTION public.validate_training_item_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type NOT IN ('course', 'package', 'pathway', 'library', 'resource', 'guide', 'template', 'toolkit') THEN
    RAISE EXCEPTION 'Invalid training item type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Harden assignment validation: explicitly name blocked types
CREATE OR REPLACE FUNCTION public.validate_training_assignment()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  v_item_type text;
BEGIN
  SELECT type INTO v_item_type
  FROM public.training_items
  WHERE id = NEW.assigned_item_id;

  IF v_item_type IS NULL THEN
    RAISE EXCEPTION 'Assigned item does not exist: %', NEW.assigned_item_id;
  END IF;

  IF v_item_type NOT IN ('course', 'pathway') THEN
    RAISE EXCEPTION 'Cannot assign item of type "%". Only course and pathway are assignable. Library/resource items are discovery-only.', v_item_type;
  END IF;

  IF NEW.assigned_item_type != v_item_type THEN
    RAISE EXCEPTION 'assigned_item_type "%" does not match actual item type "%"', NEW.assigned_item_type, v_item_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.school_team_members
    WHERE school_id = NEW.school_id
      AND teacher_id = NEW.assigned_to_teacher_id
  ) THEN
    RAISE EXCEPTION 'Teacher % is not a member of school %', NEW.assigned_to_teacher_id, NEW.school_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Harden execution validation: explicitly name blocked types
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
  RETURN NEW;
END;
$function$;

-- 4. Harden course progress validation
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

  IF NEW.assignment_id != v_exec.assignment_id
     OR NEW.school_id != v_exec.school_id
     OR NEW.teacher_id != v_exec.teacher_id
     OR NEW.course_id != v_exec.training_item_id THEN
    RAISE EXCEPTION 'Course progress context must match execution context';
  END IF;

  RETURN NEW;
END;
$function$;