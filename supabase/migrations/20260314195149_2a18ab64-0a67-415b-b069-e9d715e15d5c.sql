
-- Fix 1: school_profiles — Allow public SELECT for completed schools (non-sensitive fields only)
-- The query itself selects limited columns. RLS here grants row access.
-- We use a view for truly sensitive column isolation if needed later.
CREATE POLICY "Public can read completed school profiles"
  ON public.school_profiles
  FOR SELECT TO anon, authenticated
  USING (onboarding_completed = true);

-- Fix 2: intelligence_verified_state_snapshots — Allow school roles to read for talent search/discovery
CREATE POLICY "School roles can read verified state snapshots"
  ON public.intelligence_verified_state_snapshots
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'school_recruiter'::app_role) OR
    has_role(auth.uid(), 'school_academic_lead'::app_role)
  );

-- Fix 3: intelligence_talent_profiles — Allow school roles to read for talent search ranking
CREATE POLICY "School roles can read talent profiles for discovery"
  ON public.intelligence_talent_profiles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'school_recruiter'::app_role) OR
    has_role(auth.uid(), 'school_academic_lead'::app_role)
  );
