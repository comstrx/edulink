
-- Add is_system_domain flag to taxonomy_term_types
ALTER TABLE public.taxonomy_term_types
  ADD COLUMN IF NOT EXISTS is_system_domain boolean NOT NULL DEFAULT false;

-- Mark core domains as protected system domains
UPDATE public.taxonomy_term_types
SET is_system_domain = true
WHERE key IN (
  'regions', 'countries', 'cities', 'districts',
  'curriculums', 'subjects', 'grade_bands',
  'employment_types', 'work_arrangements', 'delivery_modes',
  'languages', 'language_levels', 'visa_status',
  'certifications', 'availability_status',
  'role_families', 'rejection_reasons',
  'nationalities', 'degrees', 'teaching_licenses',
  'skills', 'competency_domains', 'school_types'
);
