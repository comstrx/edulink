
-- Sprint 8C: Career Mobility Engine

-- 1) Mobility tracks — types of career movement
CREATE TABLE public.mobility_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Mobility targets — specific career moves
CREATE TABLE public.mobility_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.mobility_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  target_role TEXT,
  target_curriculum_term_ids UUID[] NOT NULL DEFAULT '{}',
  target_school_type_term_ids UUID[] NOT NULL DEFAULT '{}',
  target_career_stage_id UUID REFERENCES public.career_stages(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Mobility requirements — what is needed for a transition
CREATE TABLE public.mobility_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL REFERENCES public.mobility_targets(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL,
  requirement_key TEXT NOT NULL,
  requirement_label TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  min_count INTEGER DEFAULT 1,
  min_reputation_score INTEGER,
  min_experience_years INTEGER,
  term_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Teacher mobility states — precomputed readiness snapshot
CREATE TABLE public.teacher_mobility_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.mobility_targets(id) ON DELETE CASCADE,
  readiness_percent NUMERIC NOT NULL DEFAULT 0,
  satisfied_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  gap_count INTEGER NOT NULL DEFAULT 0,
  blocking_gaps JSONB NOT NULL DEFAULT '[]',
  evaluation_trace JSONB NOT NULL DEFAULT '{}',
  engine_version TEXT NOT NULL DEFAULT '8c.1',
  last_evaluated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, target_id)
);

-- Enable RLS
ALTER TABLE public.mobility_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobility_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobility_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_mobility_states ENABLE ROW LEVEL SECURITY;

-- RLS: mobility_tracks (read-only for authenticated)
CREATE POLICY "Anyone authenticated can read mobility tracks"
  ON public.mobility_tracks FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "Admins can manage mobility tracks"
  ON public.mobility_tracks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS: mobility_targets
CREATE POLICY "Anyone authenticated can read mobility targets"
  ON public.mobility_targets FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "Admins can manage mobility targets"
  ON public.mobility_targets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS: mobility_requirements
CREATE POLICY "Anyone authenticated can read mobility requirements"
  ON public.mobility_requirements FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins can manage mobility requirements"
  ON public.mobility_requirements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS: teacher_mobility_states
CREATE POLICY "Teachers can read own mobility states"
  ON public.teacher_mobility_states FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all mobility states"
  ON public.teacher_mobility_states FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Schools can read applicant mobility states"
  ON public.teacher_mobility_states FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT a.teacher_id FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN school_profiles sp ON sp.id = j.school_id
    WHERE sp.user_id = auth.uid()
  ));
CREATE POLICY "Service role can manage mobility states"
  ON public.teacher_mobility_states FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_mobility_targets_track ON public.mobility_targets(track_id);
CREATE INDEX idx_mobility_requirements_target ON public.mobility_requirements(target_id);
CREATE INDEX idx_teacher_mobility_states_teacher ON public.teacher_mobility_states(teacher_id);
CREATE INDEX idx_teacher_mobility_states_target ON public.teacher_mobility_states(target_id);

-- Seed initial mobility tracks
INSERT INTO public.mobility_tracks (name, slug, description, sort_order) VALUES
  ('Curriculum Transition', 'curriculum-transition', 'Move between curriculum frameworks (IB, British, American, etc.)', 1),
  ('Leadership Transition', 'leadership-transition', 'Move into leadership or coordination roles', 2),
  ('School Tier Transition', 'school-tier-transition', 'Move to international or premium-tier schools', 3),
  ('Role Advancement', 'role-advancement', 'Advance within your current career track', 4);
