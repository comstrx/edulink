
-- Sprint B2-B: Extend mentor session lifecycle with requested/confirmed/declined statuses
-- Replace the validation trigger to support the full booking lifecycle

CREATE OR REPLACE FUNCTION public.validate_mentor_session_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('requested', 'confirmed', 'scheduled', 'completed', 'cancelled', 'declined', 'no_show') THEN
    RAISE EXCEPTION 'Invalid mentor session status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- Add RLS policies for mentor_sessions if not already present
-- Teachers can view their own sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_sessions' AND policyname = 'Teachers can view own sessions') THEN
    CREATE POLICY "Teachers can view own sessions" ON public.mentor_sessions
      FOR SELECT TO authenticated
      USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Mentors can view sessions assigned to them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_sessions' AND policyname = 'Mentors can view assigned sessions') THEN
    CREATE POLICY "Mentors can view assigned sessions" ON public.mentor_sessions
      FOR SELECT TO authenticated
      USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Teachers can create session requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_sessions' AND policyname = 'Teachers can create session requests') THEN
    CREATE POLICY "Teachers can create session requests" ON public.mentor_sessions
      FOR INSERT TO authenticated
      WITH CHECK (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Mentors can update sessions assigned to them (confirm/decline/complete)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_sessions' AND policyname = 'Mentors can update assigned sessions') THEN
    CREATE POLICY "Mentors can update assigned sessions" ON public.mentor_sessions
      FOR UPDATE TO authenticated
      USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Teachers can cancel their own session requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_sessions' AND policyname = 'Teachers can update own sessions') THEN
    CREATE POLICY "Teachers can update own sessions" ON public.mentor_sessions
      FOR UPDATE TO authenticated
      USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Enable RLS on mentor_sessions if not already
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on mentor_availability for public read
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_availability' AND policyname = 'Anyone can read active availability') THEN
    CREATE POLICY "Anyone can read active availability" ON public.mentor_availability
      FOR SELECT TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;
