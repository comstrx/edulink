
-- Intelligence Talent Profiles — Aggregated intelligence state per teacher
CREATE TABLE public.intelligence_talent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  
  -- CRI signals
  cri_score numeric NOT NULL DEFAULT 0,
  cri_dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  cri_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  
  -- Verified signals
  verified_signal_count integer NOT NULL DEFAULT 0,
  verified_completion_count integer NOT NULL DEFAULT 0,
  
  -- Credential signals
  credential_count integer NOT NULL DEFAULT 0,
  credential_verified_count integer NOT NULL DEFAULT 0,
  credential_strength text NOT NULL DEFAULT 'none',
  
  -- Pathway signals
  pathway_completion_count integer NOT NULL DEFAULT 0,
  active_pathway_count integer NOT NULL DEFAULT 0,
  
  -- Training signals
  training_completion_count integer NOT NULL DEFAULT 0,
  
  -- Gap signals
  unresolved_gap_count integer NOT NULL DEFAULT 0,
  gap_categories text[] NOT NULL DEFAULT '{}',
  
  -- Match signals
  best_match_score numeric DEFAULT NULL,
  best_match_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  
  -- Hiring advantage signals
  hiring_advantage_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Growth momentum
  growth_momentum text NOT NULL DEFAULT 'inactive',
  
  -- Readiness summary
  readiness_level text NOT NULL DEFAULT 'early',
  
  -- Metadata
  intelligence_updated_at timestamptz NOT NULL DEFAULT now(),
  engine_version text NOT NULL DEFAULT '7a.1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(teacher_id)
);

-- Index for talent search queries
CREATE INDEX idx_talent_profiles_cri ON public.intelligence_talent_profiles(cri_score DESC);
CREATE INDEX idx_talent_profiles_readiness ON public.intelligence_talent_profiles(readiness_level);
CREATE INDEX idx_talent_profiles_momentum ON public.intelligence_talent_profiles(growth_momentum);
CREATE INDEX idx_talent_profiles_updated ON public.intelligence_talent_profiles(intelligence_updated_at DESC);

-- RLS
ALTER TABLE public.intelligence_talent_profiles ENABLE ROW LEVEL SECURITY;

-- Teachers can read their own profile
CREATE POLICY "Teachers can read own talent profile"
  ON public.intelligence_talent_profiles FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid())
  );

-- Schools can read talent profiles for applicants
CREATE POLICY "Schools can read applicant talent profiles"
  ON public.intelligence_talent_profiles FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT a.teacher_id FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.school_profiles sp ON sp.id = j.school_id
      WHERE sp.user_id = auth.uid()
    )
  );

-- Service role can upsert (for backend handlers)
CREATE POLICY "Service role can manage talent profiles"
  ON public.intelligence_talent_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_talent_profiles_updated_at
  BEFORE UPDATE ON public.intelligence_talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
