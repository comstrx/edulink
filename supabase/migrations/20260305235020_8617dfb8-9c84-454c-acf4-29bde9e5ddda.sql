
-- Add employment_type_term_ids uuid[] to teacher_profiles
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS employment_type_term_ids uuid[] DEFAULT '{}'::uuid[];

-- Add work_arrangement_term_ids uuid[] to teacher_profiles
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS work_arrangement_term_ids uuid[] DEFAULT '{}'::uuid[];

-- Add availability_status_term_ids uuid[] to teacher_profiles (multi-select version)
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS availability_status_term_ids uuid[] DEFAULT '{}'::uuid[];

-- GIN indexes for array overlap queries
CREATE INDEX IF NOT EXISTS idx_tp_employment_type_term_ids_gin ON public.teacher_profiles USING gin (employment_type_term_ids);
CREATE INDEX IF NOT EXISTS idx_tp_work_arrangement_term_ids_gin ON public.teacher_profiles USING gin (work_arrangement_term_ids);
CREATE INDEX IF NOT EXISTS idx_tp_availability_status_term_ids_gin ON public.teacher_profiles USING gin (availability_status_term_ids);
CREATE INDEX IF NOT EXISTS idx_tp_language_ids_gin ON public.teacher_profiles USING gin (language_ids);
