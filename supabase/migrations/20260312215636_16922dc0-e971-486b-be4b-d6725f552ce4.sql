
-- 1. Allow school roles (school_admin, school_recruiter) to update applications on their own jobs
CREATE POLICY "School roles can update applications on own jobs"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  (job_id IN (
    SELECT j.id FROM jobs j
    JOIN school_profiles sp ON j.school_id = sp.id
    WHERE sp.user_id = auth.uid()
  ))
  AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'school_recruiter'::app_role)
  )
);

-- 2. Allow school roles to read applications on their own jobs
CREATE POLICY "School roles can read applications on own jobs"
ON public.applications
FOR SELECT
TO authenticated
USING (
  (job_id IN (
    SELECT j.id FROM jobs j
    JOIN school_profiles sp ON j.school_id = sp.id
    WHERE sp.user_id = auth.uid()
  ))
  AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'school_recruiter'::app_role)
  )
);

-- 3. Seed rejection_reasons taxonomy domain and terms
INSERT INTO public.taxonomy_term_types (key, name, name_en, description, is_active, is_system_domain)
VALUES ('rejection_reasons', 'Rejection Reasons', 'Rejection Reasons', 'Structured reasons for rejecting a job application', true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.taxonomy_terms (name, name_en, slug, term_type_id, sort_order, is_active)
SELECT v.name, v.name_en, v.slug, tt.id, v.sort_order, true
FROM (VALUES
  ('Missing Certification', 'Missing Certification', 'missing-certification', 1),
  ('Insufficient Experience', 'Insufficient Experience', 'insufficient-experience', 2),
  ('Weak Language Proficiency', 'Weak Language Proficiency', 'weak-language', 3),
  ('Curriculum Mismatch', 'Curriculum Mismatch', 'curriculum-mismatch', 4),
  ('Profile Incomplete', 'Profile Incomplete', 'profile-incomplete', 5),
  ('Location Unavailable', 'Location Unavailable', 'location-unavailable', 6),
  ('Position Filled', 'Position Filled', 'position-filled', 7),
  ('Other', 'Other', 'other', 8)
) AS v(name, name_en, slug, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'rejection_reasons'
ON CONFLICT DO NOTHING;
