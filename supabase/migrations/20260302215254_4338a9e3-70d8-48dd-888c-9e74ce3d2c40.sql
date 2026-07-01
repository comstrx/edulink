
-- Create school_profiles table
CREATE TABLE public.school_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_start TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT preferred_start_values CHECK (preferred_start IN ('hiring', 'training'))
);

-- Enable RLS
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: school_admin can CRUD own row
CREATE POLICY "School admins can read own profile"
ON public.school_profiles FOR SELECT
USING (auth.uid() = user_id AND has_role(auth.uid(), 'school_admin'::app_role));

CREATE POLICY "School admins can insert own profile"
ON public.school_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'school_admin'::app_role));

CREATE POLICY "School admins can update own profile"
ON public.school_profiles FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'school_admin'::app_role));
