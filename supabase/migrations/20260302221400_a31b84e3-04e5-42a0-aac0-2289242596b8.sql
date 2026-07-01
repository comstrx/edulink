
-- Create reusable timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Teacher profiles table
CREATE TABLE public.teacher_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  country TEXT,
  years_of_experience INTEGER DEFAULT 0,
  contact_email TEXT,
  cv_url TEXT,
  is_public_profile BOOLEAN NOT NULL DEFAULT true,
  is_contact_visible BOOLEAN NOT NULL DEFAULT false,
  subject_ids UUID[] DEFAULT '{}',
  curriculum_ids UUID[] DEFAULT '{}',
  certification_ids UUID[] DEFAULT '{}',
  grade_band_ids UUID[] DEFAULT '{}',
  experience JSONB DEFAULT '[]'::jsonb,
  completed_training JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles readable by everyone (including anonymous)
CREATE POLICY "Public profiles readable by everyone"
  ON public.teacher_profiles FOR SELECT
  USING (is_public_profile = true);

-- School roles can read all profiles (including private)
CREATE POLICY "School roles can read all profiles"
  ON public.teacher_profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'school_recruiter'::app_role) OR
    has_role(auth.uid(), 'school_academic_lead'::app_role)
  );

-- Teachers can read own profile
CREATE POLICY "Teachers can read own profile"
  ON public.teacher_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Teachers can insert own profile
CREATE POLICY "Teachers can insert own profile"
  ON public.teacher_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'teacher'::app_role));

-- Teachers can update own profile
CREATE POLICY "Teachers can update own profile"
  ON public.teacher_profiles FOR UPDATE
  USING (auth.uid() = user_id AND has_role(auth.uid(), 'teacher'::app_role));

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.teacher_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_teacher_profiles_updated_at
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
