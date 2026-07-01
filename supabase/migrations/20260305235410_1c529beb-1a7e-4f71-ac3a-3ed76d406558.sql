
-- ═══════════════════════════════════════════════════════════════
-- Jobs table: taxonomy IDs-only for all structured fields
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,

  -- Free-text fields
  title text NOT NULL,
  description text,
  responsibilities text[],
  requirements_text text[],
  salary_range text,
  start_date text,
  deadline date,

  -- Location (taxonomy term IDs — cascading)
  region_term_id uuid REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL,
  country_term_id uuid REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL,
  city_term_id uuid REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL,

  -- Teaching context (taxonomy term IDs)
  subject_term_ids uuid[] DEFAULT '{}'::uuid[],
  curriculum_term_ids uuid[] DEFAULT '{}'::uuid[],
  grade_band_term_ids uuid[] DEFAULT '{}'::uuid[],

  -- Contract & work (taxonomy term IDs)
  employment_type_term_ids uuid[] DEFAULT '{}'::uuid[],
  work_arrangement_term_ids uuid[] DEFAULT '{}'::uuid[],

  -- Eligibility (taxonomy term IDs)
  visa_status_term_ids uuid[] DEFAULT '{}'::uuid[],
  language_term_ids uuid[] DEFAULT '{}'::uuid[],
  language_level_term_id uuid REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL,
  certification_term_ids uuid[] DEFAULT '{}'::uuid[],

  -- Benefits & extras
  benefits text[] DEFAULT '{}'::text[],
  visa_sponsorship boolean DEFAULT false,
  relocation_support boolean DEFAULT false,
  experience_min integer DEFAULT 0,

  -- Status
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean DEFAULT false,
  is_verified boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX idx_jobs_school_id ON public.jobs (school_id);
CREATE INDEX idx_jobs_status ON public.jobs (status);
CREATE INDEX idx_jobs_region_term_id ON public.jobs (region_term_id);
CREATE INDEX idx_jobs_country_term_id ON public.jobs (country_term_id);
CREATE INDEX idx_jobs_city_term_id ON public.jobs (city_term_id);
CREATE INDEX idx_jobs_language_level_term_id ON public.jobs (language_level_term_id);

-- GIN indexes for array overlap queries
CREATE INDEX idx_jobs_subject_term_ids_gin ON public.jobs USING gin (subject_term_ids);
CREATE INDEX idx_jobs_curriculum_term_ids_gin ON public.jobs USING gin (curriculum_term_ids);
CREATE INDEX idx_jobs_grade_band_term_ids_gin ON public.jobs USING gin (grade_band_term_ids);
CREATE INDEX idx_jobs_employment_type_term_ids_gin ON public.jobs USING gin (employment_type_term_ids);
CREATE INDEX idx_jobs_work_arrangement_term_ids_gin ON public.jobs USING gin (work_arrangement_term_ids);
CREATE INDEX idx_jobs_visa_status_term_ids_gin ON public.jobs USING gin (visa_status_term_ids);
CREATE INDEX idx_jobs_language_term_ids_gin ON public.jobs USING gin (language_term_ids);
CREATE INDEX idx_jobs_certification_term_ids_gin ON public.jobs USING gin (certification_term_ids);

-- ── Updated-at trigger ──
CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ──
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can read published jobs
CREATE POLICY "Anyone can read published jobs"
  ON public.jobs FOR SELECT
  USING (status = 'published');

-- School admins can CRUD own school's jobs
CREATE POLICY "School roles can manage own jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT sp.id FROM public.school_profiles sp
      WHERE sp.user_id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'school_admin') OR
      has_role(auth.uid(), 'school_recruiter')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT sp.id FROM public.school_profiles sp
      WHERE sp.user_id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'school_admin') OR
      has_role(auth.uid(), 'school_recruiter')
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
