
-- ═══════════════════════════════════════════════════════════════
-- Sprint 6B: Pathway Runtime Engine
-- ═══════════════════════════════════════════════════════════════

-- 1. Create pathway milestone status enum
CREATE TYPE public.pathway_milestone_status AS ENUM ('locked', 'available', 'completed');

-- 2. Create pathway_executions table
CREATE TABLE public.pathway_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  pathway_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.training_enrollments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'enrolled',
  progress_percent numeric DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create pathway_milestone_progress table
CREATE TABLE public.pathway_milestone_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.pathway_executions(id) ON DELETE CASCADE,
  milestone_id text NOT NULL,
  milestone_title text NOT NULL,
  milestone_order integer NOT NULL DEFAULT 0,
  linked_course_ids uuid[] NOT NULL DEFAULT '{}',
  status pathway_milestone_status NOT NULL DEFAULT 'locked',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Unique constraints
CREATE UNIQUE INDEX uq_pathway_execution_enrollment
  ON public.pathway_executions (enrollment_id);

CREATE UNIQUE INDEX uq_pathway_execution_active
  ON public.pathway_executions (teacher_id, pathway_id)
  WHERE status NOT IN ('cancelled', 'dropped', 'completed');

CREATE UNIQUE INDEX uq_milestone_progress_per_execution
  ON public.pathway_milestone_progress (execution_id, milestone_id);

-- 5. Validate pathway execution (item must be pathway type)
CREATE OR REPLACE FUNCTION public.validate_pathway_execution()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  v_item_type text;
BEGIN
  SELECT type INTO v_item_type FROM public.training_items WHERE id = NEW.pathway_id;
  IF v_item_type IS NULL THEN
    RAISE EXCEPTION 'Training item does not exist: %', NEW.pathway_id;
  END IF;
  IF v_item_type != 'pathway' THEN
    RAISE EXCEPTION 'Pathway execution requires item of type "pathway", got "%"', v_item_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_pathway_execution
  BEFORE INSERT ON public.pathway_executions
  FOR EACH ROW EXECUTE FUNCTION public.validate_pathway_execution();

-- 6. Validate pathway execution status transitions
CREATE OR REPLACE FUNCTION public.validate_pathway_execution_transition()
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
      RAISE EXCEPTION 'Invalid pathway execution status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_pathway_execution_transition
  BEFORE UPDATE ON public.pathway_executions
  FOR EACH ROW EXECUTE FUNCTION public.validate_pathway_execution_transition();

-- 7. Validate milestone status transitions (locked → available → completed)
CREATE OR REPLACE FUNCTION public.validate_milestone_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'locked' AND NEW.status = 'available') OR
      (OLD.status = 'available' AND NEW.status = 'completed')
    ) THEN
      RAISE EXCEPTION 'Invalid milestone status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_milestone_status_transition
  BEFORE UPDATE ON public.pathway_milestone_progress
  FOR EACH ROW EXECUTE FUNCTION public.validate_milestone_status_transition();

-- 8. Auto-update updated_at triggers
CREATE TRIGGER trg_pathway_execution_updated_at
  BEFORE UPDATE ON public.pathway_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_milestone_progress_updated_at
  BEFORE UPDATE ON public.pathway_milestone_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Enable RLS
ALTER TABLE public.pathway_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathway_milestone_progress ENABLE ROW LEVEL SECURITY;

-- 10. RLS: pathway_executions
CREATE POLICY "Teachers can read own pathway executions"
  ON public.pathway_executions FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "School roles can read school pathway executions"
  ON public.pathway_executions FOR SELECT TO authenticated
  USING (
    enrollment_id IN (
      SELECT te.id FROM public.training_enrollments te
      JOIN public.training_assignments ta ON te.assignment_id = ta.id
      JOIN public.school_profiles sp ON ta.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'school_training_manager'::app_role))
  );

CREATE POLICY "Admins can manage all pathway executions"
  ON public.pathway_executions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 11. RLS: pathway_milestone_progress
CREATE POLICY "Teachers can read own milestone progress"
  ON public.pathway_milestone_progress FOR SELECT TO authenticated
  USING (execution_id IN (
    SELECT pe.id FROM public.pathway_executions pe
    WHERE pe.teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "School roles can read school milestone progress"
  ON public.pathway_milestone_progress FOR SELECT TO authenticated
  USING (
    execution_id IN (
      SELECT pe.id FROM public.pathway_executions pe
      JOIN public.training_enrollments te ON pe.enrollment_id = te.id
      JOIN public.training_assignments ta ON te.assignment_id = ta.id
      JOIN public.school_profiles sp ON ta.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'school_training_manager'::app_role))
  );

CREATE POLICY "Admins can manage all milestone progress"
  ON public.pathway_milestone_progress FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 12. Indexes
CREATE INDEX idx_pathway_exec_teacher_id ON public.pathway_executions(teacher_id);
CREATE INDEX idx_pathway_exec_pathway_id ON public.pathway_executions(pathway_id);
CREATE INDEX idx_pathway_exec_enrollment_id ON public.pathway_executions(enrollment_id);
CREATE INDEX idx_pathway_exec_status ON public.pathway_executions(status);
CREATE INDEX idx_milestone_progress_execution_id ON public.pathway_milestone_progress(execution_id);
CREATE INDEX idx_milestone_progress_status ON public.pathway_milestone_progress(status);
