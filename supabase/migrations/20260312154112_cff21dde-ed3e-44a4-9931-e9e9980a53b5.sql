-- Allow authenticated users to INSERT their own recommendation snapshots
CREATE POLICY "Teachers can insert own recommendation snapshots"
ON public.intelligence_recommendation_snapshots
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to UPDATE their own recommendation snapshots (mark stale)
CREATE POLICY "Teachers can update own recommendation snapshots"
ON public.intelligence_recommendation_snapshots
FOR UPDATE
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
  )
);

-- Allow admins to manage all recommendation snapshots
CREATE POLICY "Admins can manage all recommendation snapshots"
ON public.intelligence_recommendation_snapshots
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));