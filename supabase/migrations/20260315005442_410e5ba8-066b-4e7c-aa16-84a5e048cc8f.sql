ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS profile_source text NOT NULL DEFAULT 'auth';