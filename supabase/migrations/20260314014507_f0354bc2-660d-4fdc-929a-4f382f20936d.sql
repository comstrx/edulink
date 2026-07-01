
-- Sprint 6E: Mentor Validation System

-- 1) Mentor status enum
DO $$ BEGIN
  CREATE TYPE public.mentor_status AS ENUM ('pending', 'active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Review decision enum
DO $$ BEGIN
  CREATE TYPE public.mentor_review_decision AS ENUM ('approved', 'rejected', 'needs_revision');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) Mentors table
CREATE TABLE IF NOT EXISTS public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.mentor_status NOT NULL DEFAULT 'pending',
  bio text,
  years_experience integer,
  languages uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- Mentors can read own profile
CREATE POLICY "Mentors can read own profile" ON public.mentors
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Mentors can update own profile
CREATE POLICY "Mentors can update own profile" ON public.mentors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins can manage all mentors" ON public.mentors
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can read active mentors
CREATE POLICY "Authenticated can read active mentors" ON public.mentors
  FOR SELECT TO authenticated
  USING (status = 'active');

-- 4) Mentor specializations junction table
CREATE TABLE IF NOT EXISTS public.mentor_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.taxonomy_terms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, term_id)
);

ALTER TABLE public.mentor_specializations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage own specializations" ON public.mentor_specializations
  FOR ALL TO authenticated
  USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()))
  WITH CHECK (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all specializations" ON public.mentor_specializations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read specializations" ON public.mentor_specializations
  FOR SELECT TO authenticated
  USING (true);

-- 5) Mentor reviews table
CREATE TABLE IF NOT EXISTS public.mentor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES public.training_executions(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES public.training_evidence(id) ON DELETE CASCADE,
  review_decision public.mentor_review_decision NOT NULL,
  review_notes text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, evidence_id)
);

ALTER TABLE public.mentor_reviews ENABLE ROW LEVEL SECURITY;

-- Mentors can read/insert/update own reviews
CREATE POLICY "Mentors can read own reviews" ON public.mentor_reviews
  FOR SELECT TO authenticated
  USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Mentors can insert reviews" ON public.mentor_reviews
  FOR INSERT TO authenticated
  WITH CHECK (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Mentors can update own reviews" ON public.mentor_reviews
  FOR UPDATE TO authenticated
  USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

-- Teachers can read reviews on their evidence
CREATE POLICY "Teachers can read reviews on own evidence" ON public.mentor_reviews
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

-- Admins full access
CREATE POLICY "Admins can manage all reviews" ON public.mentor_reviews
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- School roles can read reviews for their team
CREATE POLICY "School roles can read team reviews" ON public.mentor_reviews
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'school_training_manager'::app_role))
    AND teacher_id IN (
      SELECT stm.teacher_id FROM public.school_team_members stm
      JOIN public.school_profiles sp ON stm.school_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
  );

-- 6) Validation trigger for mentor reviews
CREATE OR REPLACE FUNCTION public.validate_mentor_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_evidence record;
BEGIN
  -- Verify evidence exists and belongs to the teacher
  SELECT teacher_id, execution_id, review_status INTO v_evidence
    FROM public.training_evidence WHERE id = NEW.evidence_id;

  IF v_evidence IS NULL THEN
    RAISE EXCEPTION 'Evidence % does not exist', NEW.evidence_id;
  END IF;

  IF v_evidence.teacher_id != NEW.teacher_id THEN
    RAISE EXCEPTION 'Evidence does not belong to specified teacher';
  END IF;

  IF v_evidence.execution_id != NEW.execution_id THEN
    RAISE EXCEPTION 'Evidence does not belong to specified execution';
  END IF;

  -- Mentor cannot review own evidence (teacher cannot be their own mentor)
  IF EXISTS (SELECT 1 FROM public.mentors WHERE id = NEW.mentor_id AND user_id IN (
    SELECT user_id FROM public.teacher_profiles WHERE id = NEW.teacher_id
  )) THEN
    RAISE EXCEPTION 'Mentor cannot review their own evidence';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mentor_review
  BEFORE INSERT OR UPDATE ON public.mentor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_mentor_review();

-- 7) Auto-update evidence review_status when mentor review is created
CREATE OR REPLACE FUNCTION public.apply_mentor_review_to_evidence()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Map mentor decision to evidence review_status
  IF NEW.review_decision = 'approved' THEN
    UPDATE public.training_evidence
      SET review_status = 'approved', reviewer_id = (SELECT user_id FROM public.mentors WHERE id = NEW.mentor_id), feedback = NEW.review_notes, reviewed_at = NEW.reviewed_at
      WHERE id = NEW.evidence_id;
  ELSIF NEW.review_decision = 'rejected' THEN
    UPDATE public.training_evidence
      SET review_status = 'rejected', reviewer_id = (SELECT user_id FROM public.mentors WHERE id = NEW.mentor_id), feedback = NEW.review_notes, reviewed_at = NEW.reviewed_at
      WHERE id = NEW.evidence_id;
  ELSIF NEW.review_decision = 'needs_revision' THEN
    UPDATE public.training_evidence
      SET review_status = 'needs_revision', reviewer_id = (SELECT user_id FROM public.mentors WHERE id = NEW.mentor_id), feedback = NEW.review_notes, reviewed_at = NEW.reviewed_at
      WHERE id = NEW.evidence_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_mentor_review
  AFTER INSERT OR UPDATE ON public.mentor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.apply_mentor_review_to_evidence();

-- 8) Auto-complete milestones when evidence is approved
CREATE OR REPLACE FUNCTION public.check_milestone_on_evidence_approval()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_milestone_id text;
  v_execution_id uuid;
  v_all_approved boolean;
BEGIN
  -- Only trigger when status changes to approved
  IF NEW.review_status = 'approved' AND (OLD.review_status IS DISTINCT FROM 'approved') THEN
    v_milestone_id := NEW.milestone_id;
    
    IF v_milestone_id IS NOT NULL THEN
      -- Find the pathway execution for this evidence's execution
      SELECT pe.id INTO v_execution_id
        FROM public.pathway_executions pe
        JOIN public.training_enrollments te ON pe.enrollment_id = te.id
        JOIN public.training_executions tex ON tex.enrollment_id = te.id
        WHERE tex.id = NEW.execution_id
        LIMIT 1;

      IF v_execution_id IS NOT NULL THEN
        -- Check if ALL evidence for this milestone is approved
        SELECT NOT EXISTS (
          SELECT 1 FROM public.training_evidence
          WHERE milestone_id = v_milestone_id
            AND execution_id = NEW.execution_id
            AND review_status != 'approved'
        ) INTO v_all_approved;

        IF v_all_approved THEN
          -- Complete the milestone if it's available
          UPDATE public.pathway_milestone_progress
            SET status = 'completed', completed_at = now()
            WHERE execution_id = v_execution_id
              AND milestone_id = v_milestone_id
              AND status = 'available';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_milestone_on_approval
  AFTER UPDATE ON public.training_evidence
  FOR EACH ROW EXECUTE FUNCTION public.check_milestone_on_evidence_approval();

-- 9) Add verified_completion column to training_completions
ALTER TABLE public.training_completions ADD COLUMN IF NOT EXISTS verified_completion boolean NOT NULL DEFAULT false;
ALTER TABLE public.training_completions ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.training_completions ADD COLUMN IF NOT EXISTS verified_by_mentor_id uuid REFERENCES public.mentors(id);

-- 10) Updated_at triggers
CREATE TRIGGER set_mentors_updated_at BEFORE UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_mentor_reviews_updated_at BEFORE UPDATE ON public.mentor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
