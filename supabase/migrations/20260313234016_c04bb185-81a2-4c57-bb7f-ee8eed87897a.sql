
-- 1. Create course_progress_status enum
CREATE TYPE public.course_progress_status AS ENUM ('not_started', 'in_progress', 'completed');

-- 2. Create course_progress table
CREATE TABLE public.course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL UNIQUE REFERENCES public.training_executions(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.training_assignments(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.school_profiles(id),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id),
  course_id uuid NOT NULL REFERENCES public.training_items(id),
  progress_status public.course_progress_status NOT NULL DEFAULT 'not_started',
  progress_percent numeric CHECK (progress_percent IS NULL OR (progress_percent >= 0 AND progress_percent <= 100)),
  started_at timestamptz,
  first_activity_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_course_progress_teacher ON public.course_progress(teacher_id);
CREATE INDEX idx_course_progress_school ON public.course_progress(school_id);
CREATE INDEX idx_course_progress_course ON public.course_progress(course_id);

-- 4. updated_at trigger
CREATE TRIGGER update_course_progress_updated_at
  BEFORE UPDATE ON public.course_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Validation trigger: only course type allowed, context must match execution
CREATE OR REPLACE FUNCTION public.validate_course_progress()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
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
    RAISE EXCEPTION 'Course progress only allowed for course executions, got "%"', v_exec.training_item_type;
  END IF;

  IF NEW.assignment_id != v_exec.assignment_id
     OR NEW.school_id != v_exec.school_id
     OR NEW.teacher_id != v_exec.teacher_id
     OR NEW.course_id != v_exec.training_item_id THEN
    RAISE EXCEPTION 'Course progress context must match execution context';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_course_progress
  BEFORE INSERT OR UPDATE ON public.course_progress
  FOR EACH ROW EXECUTE FUNCTION public.validate_course_progress();

-- 6. Forward-only state transition trigger
CREATE OR REPLACE FUNCTION public.validate_course_progress_transition()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.progress_status IS DISTINCT FROM NEW.progress_status THEN
    IF NOT (
      (OLD.progress_status = 'not_started' AND NEW.progress_status = 'in_progress') OR
      (OLD.progress_status = 'in_progress' AND NEW.progress_status = 'completed')
    ) THEN
      RAISE EXCEPTION 'Invalid course progress transition: % -> %', OLD.progress_status, NEW.progress_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_course_progress_transition
  BEFORE UPDATE ON public.course_progress
  FOR EACH ROW EXECUTE FUNCTION public.validate_course_progress_transition();

-- 7. Auto-create course_progress when course execution is inserted
CREATE OR REPLACE FUNCTION public.auto_create_course_progress()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
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
$$;

CREATE TRIGGER trg_auto_create_course_progress
  AFTER INSERT ON public.training_executions
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_course_progress();

-- 8. Enable RLS
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies
CREATE POLICY "Teachers can read own course progress"
  ON public.course_progress FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all course progress"
  ON public.course_progress FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School roles can read school course progress"
  ON public.course_progress FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid())
    AND (public.has_role(auth.uid(), 'school_admin') OR public.has_role(auth.uid(), 'school_training_manager'))
  );

-- 10. Backfill existing course executions
INSERT INTO public.course_progress (execution_id, assignment_id, school_id, teacher_id, course_id, progress_status, started_at, first_activity_at, last_activity_at, completed_at)
SELECT
  e.id,
  e.assignment_id,
  e.school_id,
  e.teacher_id,
  e.training_item_id,
  CASE
    WHEN e.execution_status::text = 'assigned' THEN 'not_started'::public.course_progress_status
    WHEN e.execution_status::text = 'active' THEN 'in_progress'::public.course_progress_status
    WHEN e.execution_status::text = 'completed' THEN 'completed'::public.course_progress_status
  END,
  CASE WHEN e.execution_status::text IN ('active','completed') THEN COALESCE(e.activated_at, e.created_at) END,
  CASE WHEN e.execution_status::text IN ('active','completed') THEN COALESCE(e.activated_at, e.created_at) END,
  e.last_activity_at,
  e.completed_at
FROM public.training_executions e
WHERE e.training_item_type = 'course'
  AND e.execution_status::text != 'cancelled'
  AND NOT EXISTS (SELECT 1 FROM public.course_progress cp WHERE cp.execution_id = e.id);
