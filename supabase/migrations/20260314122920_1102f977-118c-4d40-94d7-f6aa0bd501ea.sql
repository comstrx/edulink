
-- Sprint 8D: Institutional Workforce Intelligence

-- School Workforce Profiles — aggregated workforce intelligence per school
CREATE TABLE public.school_workforce_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  teacher_count INT NOT NULL DEFAULT 0,
  verified_teacher_count INT NOT NULL DEFAULT 0,
  average_reputation_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  average_cri_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  credential_coverage NUMERIC(5,2) NOT NULL DEFAULT 0,
  career_stage_distribution JSONB NOT NULL DEFAULT '{}',
  reputation_distribution JSONB NOT NULL DEFAULT '{}',
  top_gaps JSONB NOT NULL DEFAULT '[]',
  promotion_ready_count INT NOT NULL DEFAULT 0,
  engine_version TEXT NOT NULL DEFAULT '1.0',
  workforce_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

ALTER TABLE public.school_workforce_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can view own workforce profile"
  ON public.school_workforce_profiles FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage workforce profiles"
  ON public.school_workforce_profiles FOR ALL TO authenticated
  USING (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ));

-- Department Capability Snapshots — per subject/curriculum within a school
CREATE TABLE public.department_capability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL,
  department_label TEXT NOT NULL,
  teacher_count INT NOT NULL DEFAULT 0,
  average_reputation_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  average_cri_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  verified_count INT NOT NULL DEFAULT 0,
  credential_coverage NUMERIC(5,2) NOT NULL DEFAULT 0,
  stage_distribution JSONB NOT NULL DEFAULT '{}',
  gap_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.department_capability_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can view own department snapshots"
  ON public.department_capability_snapshots FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage department snapshots"
  ON public.department_capability_snapshots FOR ALL TO authenticated
  USING (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ));

-- Workforce Gap Reports — institutional capability gaps
CREATE TABLE public.workforce_gap_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  gap_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  affected_department TEXT,
  description TEXT NOT NULL,
  recommended_intervention TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workforce_gap_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can view own workforce gaps"
  ON public.workforce_gap_reports FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage workforce gaps"
  ON public.workforce_gap_reports FOR ALL TO authenticated
  USING (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ));

-- Promotion Readiness Map — teachers ready for advancement
CREATE TABLE public.promotion_readiness_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  current_stage TEXT,
  next_stage TEXT,
  readiness_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  gap_count INT NOT NULL DEFAULT 0,
  blocking_gaps JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, teacher_id)
);

ALTER TABLE public.promotion_readiness_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can view own promotion entries"
  ON public.promotion_readiness_entries FOR SELECT TO authenticated
  USING (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage promotion entries"
  ON public.promotion_readiness_entries FOR ALL TO authenticated
  USING (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (school_id IN (
    SELECT id FROM public.school_profiles WHERE user_id = auth.uid()
  ));

-- Updated_at triggers
CREATE TRIGGER set_school_workforce_profiles_updated_at
  BEFORE UPDATE ON public.school_workforce_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_department_capability_snapshots_updated_at
  BEFORE UPDATE ON public.department_capability_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_promotion_readiness_entries_updated_at
  BEFORE UPDATE ON public.promotion_readiness_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
