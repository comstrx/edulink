
-- Task 10: Compliance Requirements
CREATE TABLE public.compliance_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  training_item_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT true,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, training_item_id)
);

ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School owners can manage compliance requirements"
  ON public.compliance_requirements FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_compliance_requirements_updated_at
  BEFORE UPDATE ON public.compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Teacher Compliance Status (derived view, materialized as table for performance)
CREATE TABLE public.teacher_compliance_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.compliance_requirements(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, requirement_id)
);

ALTER TABLE public.teacher_compliance_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School owners can view compliance status"
  ON public.teacher_compliance_status FOR SELECT TO authenticated
  USING (school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid()));

CREATE POLICY "School owners can manage compliance status"
  ON public.teacher_compliance_status FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_teacher_compliance_status_updated_at
  BEFORE UPDATE ON public.teacher_compliance_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Task 11: Saved Training Items
CREATE TABLE public.saved_training_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_item_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_item_id)
);

ALTER TABLE public.saved_training_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved items"
  ON public.saved_training_items FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Task 12: Mentor Availability
CREATE TABLE public.mentor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage own availability"
  ON public.mentor_availability FOR ALL TO authenticated
  USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()))
  WITH CHECK (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Anyone authenticated can view availability"
  ON public.mentor_availability FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_mentor_availability_updated_at
  BEFORE UPDATE ON public.mentor_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mentor Sessions
CREATE TABLE public.mentor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes smallint NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  session_type text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can view their sessions"
  ON public.mentor_sessions FOR SELECT TO authenticated
  USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view their sessions"
  ON public.mentor_sessions FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create sessions"
  ON public.mentor_sessions FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid())
    OR mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
  );

CREATE POLICY "Session participants can update"
  ON public.mentor_sessions FOR UPDATE TO authenticated
  USING (
    teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid())
    OR mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
  );

CREATE TRIGGER update_mentor_sessions_updated_at
  BEFORE UPDATE ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for session status
CREATE OR REPLACE FUNCTION public.validate_mentor_session_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('scheduled', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Invalid mentor session status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_mentor_session_status_trigger
  BEFORE INSERT OR UPDATE ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_mentor_session_status();

-- Validation trigger for compliance status
CREATE OR REPLACE FUNCTION public.validate_compliance_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed', 'overdue') THEN
    RAISE EXCEPTION 'Invalid compliance status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_compliance_status_trigger
  BEFORE INSERT OR UPDATE ON public.teacher_compliance_status
  FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_status();
