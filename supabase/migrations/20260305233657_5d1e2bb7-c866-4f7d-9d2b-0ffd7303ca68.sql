
-- Add visa_status_term_id to teacher_profiles (alongside legacy visa_status text)
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS visa_status_term_id uuid REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL;

-- Add availability_status_term_id (alongside legacy availability_status text)
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS availability_status_term_id uuid REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL;

-- Add migration_meta for backfill logging
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS migration_meta jsonb DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_visa_status_term_id ON public.teacher_profiles (visa_status_term_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_availability_status_term_id ON public.teacher_profiles (availability_status_term_id);
