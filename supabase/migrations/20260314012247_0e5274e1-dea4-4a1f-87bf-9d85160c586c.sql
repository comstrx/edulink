
-- ═══════════════════════════════════════════════════════════════
-- Sprint 6A: Unified Enrollment Layer
-- ═══════════════════════════════════════════════════════════════

-- 1. Create enrollment status enum
CREATE TYPE public.training_enrollment_status AS ENUM (
  'enrolled', 'active', 'completed', 'cancelled', 'dropped'
);

-- 2. Create enrollment source enum
CREATE TYPE public.training_enrollment_source AS ENUM (
  'self', 'school', 'pathway'
);

-- 3. Create training_enrollments table
CREATE TABLE public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  enrollment_source training_enrollment_source NOT NULL,
  assignment_id uuid REFERENCES public.training_assignments(id) ON DELETE SET NULL,
  pathway_enrollment_id uuid REFERENCES public.training_enrollments(id) ON DELETE SET NULL,
  status training_enrollment_status NOT NULL DEFAULT 'enrolled',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Prevent duplicate active enrollments per teacher+item+source context
CREATE UNIQUE INDEX uq_active_enrollment_self
  ON public.training_enrollments (teacher_id, item_id)
  WHERE enrollment_source = 'self' AND status NOT IN ('cancelled', 'dropped');

CREATE UNIQUE INDEX uq_active_enrollment_school
  ON public.training_enrollments (teacher_id, item_id, assignment_id)
  WHERE enrollment_source = 'school' AND status NOT IN ('cancelled', 'dropped');

-- 5. Validate enrollment item type (only course/pathway)
CREATE OR REPLACE FUNCTION public.validate_training_enrollment()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  v_item_type text;
  v_item_status text;
  v_item_active boolean;
BEGIN
  SELECT type, status, is_active INTO v_item_type, v_item_status, v_item_active
  FROM public.training_items WHERE id = NEW.item_id;

  IF v_item_type IS NULL THEN
    RAISE EXCEPTION 'Training item does not exist: %', NEW.item_id;
  END IF;

  IF v_item_type NOT IN ('course', 'pathway') THEN
    RAISE EXCEPTION 'Cannot enroll in item type "%". Only course and pathway are enrollable.', v_item_type;
  END IF;

  IF NEW.item_type != v_item_type THEN
    RAISE EXCEPTION 'item_type "%" does not match actual type "%"', NEW.item_type, v_item_type;
  END IF;

  -- For self-enrollment, item must be published and active
  IF NEW.enrollment_source = 'self' THEN
    IF v_item_status != 'published' OR v_item_active != true THEN
      RAISE EXCEPTION 'Cannot self-enroll in unpublished or inactive item';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_training_enrollment
  BEFORE INSERT ON public.training_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.validate_training_enrollment();

-- 6. Enrollment status transition validation
CREATE OR REPLACE FUNCTION public.validate_enrollment_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'enrolled' AND NEW.status IN ('active', 'cancelled', 'dropped')) OR
      (OLD.status = 'active' AND NEW.status IN ('completed', 'cancelled', 'dropped'))
    ) THEN
      RAISE EXCEPTION 'Invalid enrollment status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_enrollment_status_transition
  BEFORE UPDATE ON public.training_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.validate_enrollment_status_transition();

-- 7. Auto-update updated_at
CREATE TRIGGER trg_enrollment_updated_at
  BEFORE UPDATE ON public.training_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Add enrollment_id to training_executions
ALTER TABLE public.training_executions
  ADD COLUMN IF NOT EXISTS enrollment_id uuid REFERENCES public.training_enrollments(id) ON DELETE SET NULL;

-- 9. Auto-create enrollment when school assignment is created
CREATE OR REPLACE FUNCTION public.auto_create_enrollment_on_assignment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment_id uuid;
BEGIN
  IF NEW.status != 'cancelled' THEN
    INSERT INTO public.training_enrollments (
      teacher_id, item_id, item_type, enrollment_source, assignment_id, status
    ) VALUES (
      NEW.assigned_to_teacher_id, NEW.assigned_item_id, NEW.assigned_item_type, 'school', NEW.id, 'enrolled'
    )
    RETURNING id INTO v_enrollment_id;

    -- Link the enrollment to the auto-created execution
    UPDATE public.training_executions
    SET enrollment_id = v_enrollment_id
    WHERE assignment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_create_enrollment_on_assignment
  AFTER INSERT ON public.training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_enrollment_on_assignment();

-- 10. Auto-cancel enrollment when assignment is cancelled
CREATE OR REPLACE FUNCTION public.auto_cancel_enrollment_on_assignment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.training_enrollments
    SET status = 'cancelled'
    WHERE assignment_id = NEW.id
      AND status IN ('enrolled', 'active');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_cancel_enrollment_on_assignment
  AFTER UPDATE ON public.training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.auto_cancel_enrollment_on_assignment();

-- 11. Enable RLS
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies
CREATE POLICY "Teachers can read own enrollments"
  ON public.training_enrollments FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can insert self-enrollments"
  ON public.training_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    enrollment_source = 'self'
    AND teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "Teachers can update own enrollments"
  ON public.training_enrollments FOR UPDATE TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "School roles can read school enrollments"
  ON public.training_enrollments FOR SELECT TO authenticated
  USING (
    assignment_id IS NOT NULL
    AND assignment_id IN (
      SELECT ta.id FROM public.training_assignments ta
      JOIN public.school_profiles sp ON ta.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'school_training_manager'::app_role))
  );

CREATE POLICY "Admins can manage all enrollments"
  ON public.training_enrollments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 13. Indexes for performance
CREATE INDEX idx_enrollments_teacher_id ON public.training_enrollments(teacher_id);
CREATE INDEX idx_enrollments_item_id ON public.training_enrollments(item_id);
CREATE INDEX idx_enrollments_assignment_id ON public.training_enrollments(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_enrollments_status ON public.training_enrollments(status);
CREATE INDEX idx_executions_enrollment_id ON public.training_executions(enrollment_id) WHERE enrollment_id IS NOT NULL;
