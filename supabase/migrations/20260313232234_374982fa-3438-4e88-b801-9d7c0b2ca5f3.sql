
-- 1. Create execution status enum
CREATE TYPE public.training_execution_status AS ENUM ('assigned', 'active', 'completed', 'cancelled');

-- 2. Create training_executions table
CREATE TABLE public.training_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.training_assignments(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.school_profiles(id),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id),
  training_item_id uuid NOT NULL REFERENCES public.training_items(id),
  training_item_type text NOT NULL,
  execution_status training_execution_status NOT NULL DEFAULT 'assigned',
  activated_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_execution_per_assignment UNIQUE (assignment_id)
);

-- 3. Indexes
CREATE INDEX idx_training_executions_teacher ON public.training_executions(teacher_id);
CREATE INDEX idx_training_executions_school ON public.training_executions(school_id);
CREATE INDEX idx_training_executions_status ON public.training_executions(execution_status);

-- 4. Auto-update updated_at trigger
CREATE TRIGGER set_updated_at_training_executions
  BEFORE UPDATE ON public.training_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Validation trigger: ensure item type matches and is course/pathway only
CREATE OR REPLACE FUNCTION public.validate_training_execution()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_item_type text;
BEGIN
  SELECT type INTO v_item_type FROM public.training_items WHERE id = NEW.training_item_id;
  IF v_item_type IS NULL THEN
    RAISE EXCEPTION 'Training item does not exist: %', NEW.training_item_id;
  END IF;
  IF v_item_type NOT IN ('course', 'pathway') THEN
    RAISE EXCEPTION 'Cannot create execution for item type "%". Only course and pathway allowed.', v_item_type;
  END IF;
  IF NEW.training_item_type != v_item_type THEN
    RAISE EXCEPTION 'training_item_type "%" does not match actual type "%"', NEW.training_item_type, v_item_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_training_execution
  BEFORE INSERT OR UPDATE ON public.training_executions
  FOR EACH ROW EXECUTE FUNCTION public.validate_training_execution();

-- 6. Lifecycle transition validation
CREATE OR REPLACE FUNCTION public.validate_execution_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.execution_status IS DISTINCT FROM NEW.execution_status THEN
    IF NOT (
      (OLD.execution_status = 'assigned' AND NEW.execution_status IN ('active', 'cancelled')) OR
      (OLD.execution_status = 'active' AND NEW.execution_status IN ('completed', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid execution status transition: % -> %', OLD.execution_status, NEW.execution_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_execution_status_transition
  BEFORE UPDATE ON public.training_executions
  FOR EACH ROW EXECUTE FUNCTION public.validate_execution_status_transition();

-- 7. Auto-create execution when assignment is inserted
CREATE OR REPLACE FUNCTION public.auto_create_training_execution()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
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
$$;

CREATE TRIGGER trg_auto_create_execution
  AFTER INSERT ON public.training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_training_execution();

-- 8. Auto-cancel execution when assignment is cancelled
CREATE OR REPLACE FUNCTION public.auto_cancel_execution_on_assignment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.training_executions
    SET execution_status = 'cancelled'
    WHERE assignment_id = NEW.id
      AND execution_status IN ('assigned', 'active');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_cancel_execution
  AFTER UPDATE ON public.training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.auto_cancel_execution_on_assignment();

-- 9. Enable RLS
ALTER TABLE public.training_executions ENABLE ROW LEVEL SECURITY;

-- 10. RLS policies
CREATE POLICY "Teachers can read own executions"
  ON public.training_executions FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can update own executions"
  ON public.training_executions FOR UPDATE TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "School roles can read school executions"
  ON public.training_executions FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_training_manager'))
  );

CREATE POLICY "Admins can manage all executions"
  ON public.training_executions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- System insert policy for trigger (SECURITY DEFINER handles this, but add for edge function use)
CREATE POLICY "System can insert executions"
  ON public.training_executions FOR INSERT TO authenticated
  WITH CHECK (true);
