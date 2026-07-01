
-- =============================================
-- CONTEXT RELATIONSHIP TABLES
-- Replaces array-based bindings with relational
-- tables that support contextual metadata.
-- Legacy array columns are NOT removed.
-- =============================================

-- 1. teacher_skills
CREATE TABLE public.teacher_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  skill_term_id UUID NOT NULL REFERENCES public.taxonomy_terms(id),
  proficiency_level TEXT DEFAULT NULL,
  years_experience INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, skill_term_id)
);

CREATE INDEX idx_teacher_skills_teacher ON public.teacher_skills(teacher_id);
CREATE INDEX idx_teacher_skills_skill ON public.teacher_skills(skill_term_id);

ALTER TABLE public.teacher_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read own skills" ON public.teacher_skills FOR SELECT USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can insert own skills" ON public.teacher_skills FOR INSERT WITH CHECK (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can update own skills" ON public.teacher_skills FOR UPDATE USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can delete own skills" ON public.teacher_skills FOR DELETE USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "School roles can read teacher skills" ON public.teacher_skills FOR SELECT USING (
  has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter') OR has_role(auth.uid(), 'school_academic_lead')
);
CREATE POLICY "Public profile skills readable" ON public.teacher_skills FOR SELECT USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE is_public_profile = true)
);
CREATE POLICY "Admins can manage all teacher skills" ON public.teacher_skills FOR ALL USING (
  has_role(auth.uid(), 'admin')
) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_teacher_skills_updated_at BEFORE UPDATE ON public.teacher_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. teacher_certifications
CREATE TABLE public.teacher_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  certification_term_id UUID NOT NULL REFERENCES public.taxonomy_terms(id),
  issued_by TEXT DEFAULT NULL,
  issue_date DATE DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, certification_term_id)
);

CREATE INDEX idx_teacher_certs_teacher ON public.teacher_certifications(teacher_id);
CREATE INDEX idx_teacher_certs_cert ON public.teacher_certifications(certification_term_id);

ALTER TABLE public.teacher_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read own certifications" ON public.teacher_certifications FOR SELECT USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can insert own certifications" ON public.teacher_certifications FOR INSERT WITH CHECK (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can update own certifications" ON public.teacher_certifications FOR UPDATE USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can delete own certifications" ON public.teacher_certifications FOR DELETE USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "School roles can read teacher certifications" ON public.teacher_certifications FOR SELECT USING (
  has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter') OR has_role(auth.uid(), 'school_academic_lead')
);
CREATE POLICY "Public profile certifications readable" ON public.teacher_certifications FOR SELECT USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE is_public_profile = true)
);
CREATE POLICY "Admins can manage all teacher certifications" ON public.teacher_certifications FOR ALL USING (
  has_role(auth.uid(), 'admin')
) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_teacher_certifications_updated_at BEFORE UPDATE ON public.teacher_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. teacher_degrees
CREATE TABLE public.teacher_degrees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  degree_term_id UUID NOT NULL REFERENCES public.taxonomy_terms(id),
  institution TEXT DEFAULT NULL,
  year_completed INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, degree_term_id)
);

CREATE INDEX idx_teacher_degrees_teacher ON public.teacher_degrees(teacher_id);
CREATE INDEX idx_teacher_degrees_degree ON public.teacher_degrees(degree_term_id);

ALTER TABLE public.teacher_degrees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read own degrees" ON public.teacher_degrees FOR SELECT USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can insert own degrees" ON public.teacher_degrees FOR INSERT WITH CHECK (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can update own degrees" ON public.teacher_degrees FOR UPDATE USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can delete own degrees" ON public.teacher_degrees FOR DELETE USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "School roles can read teacher degrees" ON public.teacher_degrees FOR SELECT USING (
  has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter') OR has_role(auth.uid(), 'school_academic_lead')
);
CREATE POLICY "Public profile degrees readable" ON public.teacher_degrees FOR SELECT USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE is_public_profile = true)
);
CREATE POLICY "Admins can manage all teacher degrees" ON public.teacher_degrees FOR ALL USING (
  has_role(auth.uid(), 'admin')
) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_teacher_degrees_updated_at BEFORE UPDATE ON public.teacher_degrees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. teacher_licenses
CREATE TABLE public.teacher_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  license_term_id UUID NOT NULL REFERENCES public.taxonomy_terms(id),
  issuing_authority TEXT DEFAULT NULL,
  issue_date DATE DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, license_term_id)
);

CREATE INDEX idx_teacher_licenses_teacher ON public.teacher_licenses(teacher_id);
CREATE INDEX idx_teacher_licenses_license ON public.teacher_licenses(license_term_id);

ALTER TABLE public.teacher_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read own licenses" ON public.teacher_licenses FOR SELECT USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can insert own licenses" ON public.teacher_licenses FOR INSERT WITH CHECK (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can update own licenses" ON public.teacher_licenses FOR UPDATE USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can delete own licenses" ON public.teacher_licenses FOR DELETE USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
  AND has_role(auth.uid(), 'teacher')
);
CREATE POLICY "School roles can read teacher licenses" ON public.teacher_licenses FOR SELECT USING (
  has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter') OR has_role(auth.uid(), 'school_academic_lead')
);
CREATE POLICY "Public profile licenses readable" ON public.teacher_licenses FOR SELECT USING (
  teacher_id IN (SELECT id FROM teacher_profiles WHERE is_public_profile = true)
);
CREATE POLICY "Admins can manage all teacher licenses" ON public.teacher_licenses FOR ALL USING (
  has_role(auth.uid(), 'admin')
) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_teacher_licenses_updated_at BEFORE UPDATE ON public.teacher_licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. job_skill_requirements
CREATE TABLE public.job_skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  skill_term_id UUID NOT NULL REFERENCES public.taxonomy_terms(id),
  required_level TEXT DEFAULT NULL,
  required_or_preferred TEXT NOT NULL DEFAULT 'required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, skill_term_id)
);

CREATE INDEX idx_job_skills_job ON public.job_skill_requirements(job_id);
CREATE INDEX idx_job_skills_skill ON public.job_skill_requirements(skill_term_id);

ALTER TABLE public.job_skill_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published job skills" ON public.job_skill_requirements FOR SELECT USING (
  job_id IN (SELECT id FROM jobs WHERE status = 'published')
);
CREATE POLICY "School roles can manage own job skills" ON public.job_skill_requirements FOR ALL USING (
  job_id IN (SELECT j.id FROM jobs j JOIN school_profiles sp ON j.school_id = sp.id WHERE sp.user_id = auth.uid())
  AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter'))
) WITH CHECK (
  job_id IN (SELECT j.id FROM jobs j JOIN school_profiles sp ON j.school_id = sp.id WHERE sp.user_id = auth.uid())
  AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter'))
);
CREATE POLICY "Admins can manage all job skills" ON public.job_skill_requirements FOR ALL USING (
  has_role(auth.uid(), 'admin')
) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 6. job_language_requirements
CREATE TABLE public.job_language_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  language_term_id UUID NOT NULL REFERENCES public.taxonomy_terms(id),
  min_level_term_id UUID REFERENCES public.taxonomy_terms(id) DEFAULT NULL,
  required_or_preferred TEXT NOT NULL DEFAULT 'required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, language_term_id)
);

CREATE INDEX idx_job_langs_job ON public.job_language_requirements(job_id);
CREATE INDEX idx_job_langs_lang ON public.job_language_requirements(language_term_id);

ALTER TABLE public.job_language_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published job languages" ON public.job_language_requirements FOR SELECT USING (
  job_id IN (SELECT id FROM jobs WHERE status = 'published')
);
CREATE POLICY "School roles can manage own job languages" ON public.job_language_requirements FOR ALL USING (
  job_id IN (SELECT j.id FROM jobs j JOIN school_profiles sp ON j.school_id = sp.id WHERE sp.user_id = auth.uid())
  AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter'))
) WITH CHECK (
  job_id IN (SELECT j.id FROM jobs j JOIN school_profiles sp ON j.school_id = sp.id WHERE sp.user_id = auth.uid())
  AND (has_role(auth.uid(), 'school_admin') OR has_role(auth.uid(), 'school_recruiter'))
);
CREATE POLICY "Admins can manage all job languages" ON public.job_language_requirements FOR ALL USING (
  has_role(auth.uid(), 'admin')
) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Backfill teacher_certifications from legacy certification_ids
INSERT INTO public.teacher_certifications (teacher_id, certification_term_id)
SELECT tp.id, unnest(tp.certification_ids)
FROM public.teacher_profiles tp
WHERE tp.certification_ids IS NOT NULL AND array_length(tp.certification_ids, 1) > 0
ON CONFLICT (teacher_id, certification_term_id) DO NOTHING;

-- Backfill teacher_degrees from legacy degree_ids
INSERT INTO public.teacher_degrees (teacher_id, degree_term_id)
SELECT tp.id, unnest(tp.degree_ids)
FROM public.teacher_profiles tp
WHERE tp.degree_ids IS NOT NULL AND array_length(tp.degree_ids, 1) > 0
ON CONFLICT (teacher_id, degree_term_id) DO NOTHING;

-- Backfill teacher_licenses from legacy teaching_license_ids
INSERT INTO public.teacher_licenses (teacher_id, license_term_id)
SELECT tp.id, unnest(tp.teaching_license_ids)
FROM public.teacher_profiles tp
WHERE tp.teaching_license_ids IS NOT NULL AND array_length(tp.teaching_license_ids, 1) > 0
ON CONFLICT (teacher_id, license_term_id) DO NOTHING;
