-- Add availability_status to teacher_profiles
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'open';

-- Add is_featured flag
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Add location taxonomy ID columns
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.taxonomy_terms(id),
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.taxonomy_terms(id),
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.taxonomy_terms(id),
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.taxonomy_terms(id);

-- Index for featured teachers query
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_featured ON public.teacher_profiles (is_featured) WHERE is_featured = true;

-- Index for availability filtering
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_availability ON public.teacher_profiles (availability_status);