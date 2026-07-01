-- Fix 1: intelligence_talent_profiles — allow teacher INSERT/UPDATE from client
CREATE POLICY "Teachers can insert own talent profile"
  ON public.intelligence_talent_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update own talent profile"
  ON public.intelligence_talent_profiles
  FOR UPDATE TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  );

-- Fix 2: intelligence_verified_state_snapshots — allow teacher INSERT/UPDATE from client
CREATE POLICY "Teachers can insert own verified state snapshots"
  ON public.intelligence_verified_state_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update own verified state snapshots"
  ON public.intelligence_verified_state_snapshots
  FOR UPDATE TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
  );