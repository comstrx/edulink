-- Phase 4.2 — Performance indexes for critical search and filter paths

-- ══════════════════════════════════════════════════════════════
-- teacher_profiles — Talent Search filters
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_public
  ON public.teacher_profiles (is_public_profile)
  WHERE is_public_profile = true;

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_country_id
  ON public.teacher_profiles (country_id);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_region_id
  ON public.teacher_profiles (region_id);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_city_id
  ON public.teacher_profiles (city_id);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_experience
  ON public.teacher_profiles (years_of_experience);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_availability
  ON public.teacher_profiles (availability_status);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_default_sort
  ON public.teacher_profiles (is_featured DESC, availability_status, years_of_experience DESC NULLS LAST)
  WHERE is_public_profile = true;

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_updated
  ON public.teacher_profiles (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_fullname_trgm
  ON public.teacher_profiles USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_subject_ids
  ON public.teacher_profiles USING gin (subject_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_curriculum_ids
  ON public.teacher_profiles USING gin (curriculum_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_grade_band_ids
  ON public.teacher_profiles USING gin (grade_band_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_language_ids
  ON public.teacher_profiles USING gin (language_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_certification_ids
  ON public.teacher_profiles USING gin (certification_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_work_arrangement_ids
  ON public.teacher_profiles USING gin (work_arrangement_term_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_employment_type_ids
  ON public.teacher_profiles USING gin (employment_type_term_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_avail_status_ids
  ON public.teacher_profiles USING gin (availability_status_term_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id
  ON public.teacher_profiles (user_id);

-- ══════════════════════════════════════════════════════════════
-- jobs — Job Search filters
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_jobs_published
  ON public.jobs (status)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_jobs_default_sort
  ON public.jobs (is_featured DESC, created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_jobs_country_term_id
  ON public.jobs (country_term_id);

CREATE INDEX IF NOT EXISTS idx_jobs_region_term_id
  ON public.jobs (region_term_id);

CREATE INDEX IF NOT EXISTS idx_jobs_city_term_id
  ON public.jobs (city_term_id);

CREATE INDEX IF NOT EXISTS idx_jobs_school_id
  ON public.jobs (school_id);

CREATE INDEX IF NOT EXISTS idx_jobs_salary_max
  ON public.jobs (salary_max DESC NULLS LAST)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_jobs_salary_min
  ON public.jobs (salary_min ASC NULLS LAST)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_jobs_subject_term_ids
  ON public.jobs USING gin (subject_term_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_curriculum_term_ids
  ON public.jobs USING gin (curriculum_term_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_grade_band_term_ids
  ON public.jobs USING gin (grade_band_term_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_employment_type_term_ids
  ON public.jobs USING gin (employment_type_term_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_work_arrangement_term_ids
  ON public.jobs USING gin (work_arrangement_term_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_certification_term_ids
  ON public.jobs USING gin (certification_term_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm
  ON public.jobs USING gin (title gin_trgm_ops);

-- ══════════════════════════════════════════════════════════════
-- applications — Applicant queries
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_applications_job_id
  ON public.applications (job_id);

CREATE INDEX IF NOT EXISTS idx_applications_teacher_id
  ON public.applications (teacher_id);

CREATE INDEX IF NOT EXISTS idx_applications_job_status
  ON public.applications (job_id, status);

-- ══════════════════════════════════════════════════════════════
-- Intelligence snapshots — lookup by teacher_id
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cri_snapshots_teacher_job
  ON public.intelligence_cri_snapshots (teacher_id, job_id);

CREATE INDEX IF NOT EXISTS idx_match_snapshots_teacher_job
  ON public.intelligence_match_snapshots (teacher_id, job_id);

CREATE INDEX IF NOT EXISTS idx_gap_snapshots_teacher
  ON public.intelligence_gap_snapshots (teacher_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_snapshots_teacher
  ON public.intelligence_recommendation_snapshots (teacher_id);

CREATE INDEX IF NOT EXISTS idx_verified_state_snapshots_teacher
  ON public.intelligence_verified_state_snapshots (teacher_id);

CREATE INDEX IF NOT EXISTS idx_verified_state_snapshots_status
  ON public.intelligence_verified_state_snapshots (overall_status)
  WHERE overall_status = 'full';

-- ══════════════════════════════════════════════════════════════
-- taxonomy_terms — Lookup performance
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_type_active
  ON public.taxonomy_terms (term_type_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_parent
  ON public.taxonomy_terms (parent_id)
  WHERE is_active = true;