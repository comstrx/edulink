ALTER TABLE public.teacher_profiles
ADD COLUMN teaching_demo jsonb DEFAULT '[]'::jsonb;