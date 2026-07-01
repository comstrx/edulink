
-- Add plan column to school_profiles (FREE by default)
ALTER TABLE public.school_profiles
ADD COLUMN plan text NOT NULL DEFAULT 'free'
CONSTRAINT school_profiles_plan_check CHECK (plan IN ('free', 'pro'));

-- Create contact reveal audit log
CREATE TABLE public.contact_reveal_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_user_id uuid NOT NULL,
  teacher_profile_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  revealed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_reveal_audit ENABLE ROW LEVEL SECURITY;

-- Schools can insert their own reveals
CREATE POLICY "Schools can insert own reveals"
ON public.contact_reveal_audit
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = school_user_id
  AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'school_recruiter'::app_role)
    OR has_role(auth.uid(), 'school_academic_lead'::app_role)
  )
);

-- Schools can read own reveals
CREATE POLICY "Schools can read own reveals"
ON public.contact_reveal_audit
FOR SELECT
TO authenticated
USING (auth.uid() = school_user_id);

-- Admins can read all reveals
CREATE POLICY "Admins can read all reveals"
ON public.contact_reveal_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
