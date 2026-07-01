
-- Add nationality_id column to teacher_profiles
ALTER TABLE public.teacher_profiles
  ADD COLUMN nationality_id UUID NULL
  REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL;

-- Add index for filtering performance
CREATE INDEX idx_teacher_profiles_nationality_id ON public.teacher_profiles(nationality_id);
