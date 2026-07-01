
-- Sprint 8B: Professional Reputation System

-- 1) Reputation dimension enum
CREATE TYPE public.reputation_dimension AS ENUM (
  'teaching_practice',
  'instructional_leadership',
  'subject_expertise',
  'professional_development',
  'mentor_recognition',
  'credential_authority',
  'professional_consistency',
  'hiring_success'
);

-- 2) Reputation tier enum
CREATE TYPE public.reputation_tier AS ENUM (
  'emerging',
  'practitioner',
  'verified_practitioner',
  'advanced_practitioner',
  'expert',
  'mentor_level'
);

-- 3) Reputation events log — immutable audit trail
CREATE TABLE public.reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  source_reference_id UUID,
  reputation_delta INTEGER NOT NULL DEFAULT 0,
  dimension TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Reputation profiles — aggregated current state
CREATE TABLE public.reputation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE UNIQUE,
  reputation_score INTEGER NOT NULL DEFAULT 0,
  credibility_tier TEXT NOT NULL DEFAULT 'emerging',
  dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_reputation_events INTEGER NOT NULL DEFAULT 0,
  verified_signal_count INTEGER NOT NULL DEFAULT 0,
  engine_version TEXT NOT NULL DEFAULT '8b.1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_profiles ENABLE ROW LEVEL SECURITY;

-- RLS for reputation_events
CREATE POLICY "Teachers can read own reputation events"
  ON public.reputation_events FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all reputation events"
  ON public.reputation_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Schools can read applicant reputation events"
  ON public.reputation_events FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT a.teacher_id FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN school_profiles sp ON sp.id = j.school_id
    WHERE sp.user_id = auth.uid()
  ));

-- RLS for reputation_profiles
CREATE POLICY "Teachers can read own reputation profile"
  ON public.reputation_profiles FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all reputation profiles"
  ON public.reputation_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Schools can read applicant reputation profiles"
  ON public.reputation_profiles FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT a.teacher_id FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN school_profiles sp ON sp.id = j.school_id
    WHERE sp.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage reputation profiles"
  ON public.reputation_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage reputation events"
  ON public.reputation_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_reputation_events_teacher ON public.reputation_events(teacher_id);
CREATE INDEX idx_reputation_events_type ON public.reputation_events(event_type);
CREATE INDEX idx_reputation_profiles_teacher ON public.reputation_profiles(teacher_id);
CREATE INDEX idx_reputation_profiles_tier ON public.reputation_profiles(credibility_tier);
