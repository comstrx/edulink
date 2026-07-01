-- Fix reputation_events — allow teachers to INSERT their own events
CREATE POLICY "Teachers can insert own reputation events"
  ON public.reputation_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

-- Fix reputation_profiles — allow teachers to INSERT and UPDATE their own profile
CREATE POLICY "Teachers can upsert own reputation profile"
  ON public.reputation_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update own reputation profile"
  ON public.reputation_profiles
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

-- Fix intelligence_cri_snapshots — allow teachers to INSERT and UPDATE own
CREATE POLICY "Teachers can insert own cri snapshots"
  ON public.intelligence_cri_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update own cri snapshots"
  ON public.intelligence_cri_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

-- Fix intelligence_gap_snapshots — allow teachers to INSERT and UPDATE own
CREATE POLICY "Teachers can insert own gap snapshots"
  ON public.intelligence_gap_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update own gap snapshots"
  ON public.intelligence_gap_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

-- Fix intelligence_match_snapshots — allow teachers to INSERT and UPDATE own
CREATE POLICY "Teachers can insert own match snapshots"
  ON public.intelligence_match_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update own match snapshots"
  ON public.intelligence_match_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );