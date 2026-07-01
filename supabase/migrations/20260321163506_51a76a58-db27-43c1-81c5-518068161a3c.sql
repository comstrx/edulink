
-- Admin ALL policies for intelligence snapshot tables that lack them

-- 1. intelligence_cri_snapshots
CREATE POLICY "Admins can manage all CRI snapshots"
ON public.intelligence_cri_snapshots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. intelligence_gap_snapshots
CREATE POLICY "Admins can manage all gap snapshots"
ON public.intelligence_gap_snapshots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. intelligence_match_snapshots
CREATE POLICY "Admins can manage all match snapshots"
ON public.intelligence_match_snapshots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. intelligence_verified_state_snapshots
CREATE POLICY "Admins can manage all verified state snapshots"
ON public.intelligence_verified_state_snapshots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. intelligence_talent_profiles (has service role but no admin policy)
CREATE POLICY "Admins can manage all talent profiles"
ON public.intelligence_talent_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
