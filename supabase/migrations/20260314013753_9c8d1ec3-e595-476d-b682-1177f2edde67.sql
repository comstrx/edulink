
-- ============================================================
-- Sprint 6D: Evidence / Reflection / Assessment Engine
-- ============================================================

-- 1) Evidence type enum
CREATE TYPE public.evidence_type AS ENUM (
  'lesson_plan',
  'classroom_video',
  'teaching_artifact',
  'reflection',
  'assessment_submission',
  'other'
);

-- 2) Evidence review status enum
CREATE TYPE public.evidence_review_status AS ENUM (
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'needs_revision'
);

-- 3) Training Evidence table
CREATE TABLE public.training_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES public.training_executions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.training_items(id),
  item_type text NOT NULL,
  milestone_id text,
  evidence_type public.evidence_type NOT NULL,
  title text NOT NULL DEFAULT '',
  file_url text,
  text_content text,
  review_status public.evidence_review_status NOT NULL DEFAULT 'submitted',
  reviewer_id uuid,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_training_evidence_teacher ON public.training_evidence(teacher_id);
CREATE INDEX idx_training_evidence_execution ON public.training_evidence(execution_id);
CREATE INDEX idx_training_evidence_review ON public.training_evidence(review_status);

-- Updated_at trigger
CREATE TRIGGER set_training_evidence_updated_at
  BEFORE UPDATE ON public.training_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate evidence context matches execution
CREATE OR REPLACE FUNCTION public.validate_training_evidence()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_exec record;
BEGIN
  SELECT teacher_id, training_item_id, training_item_type, execution_status
    INTO v_exec
    FROM public.training_executions WHERE id = NEW.execution_id;

  IF v_exec IS NULL THEN
    RAISE EXCEPTION 'Execution % does not exist', NEW.execution_id;
  END IF;

  IF v_exec.teacher_id != NEW.teacher_id THEN
    RAISE EXCEPTION 'Evidence teacher_id does not match execution owner';
  END IF;

  IF v_exec.training_item_id != NEW.item_id THEN
    RAISE EXCEPTION 'Evidence item_id does not match execution item';
  END IF;

  IF v_exec.training_item_type != NEW.item_type THEN
    RAISE EXCEPTION 'Evidence item_type does not match execution type';
  END IF;

  IF v_exec.execution_status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'Cannot submit evidence for execution in status "%"', v_exec.execution_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_training_evidence
  BEFORE INSERT ON public.training_evidence
  FOR EACH ROW EXECUTE FUNCTION public.validate_training_evidence();

-- Validate review status transitions
CREATE OR REPLACE FUNCTION public.validate_evidence_review_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.review_status IS DISTINCT FROM NEW.review_status THEN
    IF NOT (
      (OLD.review_status = 'submitted' AND NEW.review_status IN ('under_review', 'approved', 'rejected', 'needs_revision')) OR
      (OLD.review_status = 'under_review' AND NEW.review_status IN ('approved', 'rejected', 'needs_revision')) OR
      (OLD.review_status = 'needs_revision' AND NEW.review_status = 'submitted') OR
      (OLD.review_status = 'rejected' AND NEW.review_status = 'submitted')
    ) THEN
      RAISE EXCEPTION 'Invalid evidence review transition: % -> %', OLD.review_status, NEW.review_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_evidence_review_transition
  BEFORE UPDATE ON public.training_evidence
  FOR EACH ROW EXECUTE FUNCTION public.validate_evidence_review_transition();

-- RLS
ALTER TABLE public.training_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all evidence"
  ON public.training_evidence FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can read own evidence"
  ON public.training_evidence FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can insert own evidence"
  ON public.training_evidence FOR INSERT TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can update own evidence"
  ON public.training_evidence FOR UPDATE TO authenticated
  USING (
    teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
    AND review_status IN ('submitted', 'needs_revision', 'rejected')
  );

CREATE POLICY "Teachers can delete own submitted evidence"
  ON public.training_evidence FOR DELETE TO authenticated
  USING (
    teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
    AND review_status = 'submitted'
  );

CREATE POLICY "School roles can read team evidence"
  ON public.training_evidence FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_training_manager') OR has_role(auth.uid(), 'school_academic_lead'))
    AND execution_id IN (
      SELECT te.id FROM training_executions te
      JOIN training_assignments ta ON te.assignment_id = ta.id
      JOIN school_profiles sp ON ta.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
  );

-- 4) Pathway Reflections table
CREATE TABLE public.pathway_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.pathway_executions(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  prompt_id text NOT NULL,
  prompt_text text NOT NULL DEFAULT '',
  teacher_response text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(execution_id, prompt_id)
);

CREATE INDEX idx_pathway_reflections_execution ON public.pathway_reflections(execution_id);

CREATE TRIGGER set_pathway_reflections_updated_at
  BEFORE UPDATE ON public.pathway_reflections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate reflection ownership
CREATE OR REPLACE FUNCTION public.validate_pathway_reflection()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_exec record;
BEGIN
  SELECT teacher_id, status INTO v_exec
    FROM public.pathway_executions WHERE id = NEW.execution_id;

  IF v_exec IS NULL THEN
    RAISE EXCEPTION 'Pathway execution % does not exist', NEW.execution_id;
  END IF;

  IF v_exec.teacher_id != NEW.teacher_id THEN
    RAISE EXCEPTION 'Reflection teacher_id does not match pathway execution owner';
  END IF;

  IF v_exec.status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'Cannot submit reflection for execution in status "%"', v_exec.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_pathway_reflection
  BEFORE INSERT OR UPDATE ON public.pathway_reflections
  FOR EACH ROW EXECUTE FUNCTION public.validate_pathway_reflection();

-- RLS
ALTER TABLE public.pathway_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reflections"
  ON public.pathway_reflections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can read own reflections"
  ON public.pathway_reflections FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can insert own reflections"
  ON public.pathway_reflections FOR INSERT TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Teachers can update own reflections"
  ON public.pathway_reflections FOR UPDATE TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "School roles can read team reflections"
  ON public.pathway_reflections FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_training_manager') OR has_role(auth.uid(), 'school_academic_lead'))
    AND execution_id IN (
      SELECT pe.id FROM pathway_executions pe
      JOIN training_enrollments te ON pe.enrollment_id = te.id
      JOIN training_assignments ta ON te.assignment_id = ta.id
      JOIN school_profiles sp ON ta.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
  );

-- 5) Storage bucket for training evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-evidence', 'training-evidence', false);

-- Storage RLS: Teachers can upload to their own folder
CREATE POLICY "Teachers can upload evidence files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'training-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Teachers can read own evidence files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'training-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Teachers can delete own evidence files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'training-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can read all evidence files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'training-evidence'
    AND has_role(auth.uid(), 'admin')
  );
