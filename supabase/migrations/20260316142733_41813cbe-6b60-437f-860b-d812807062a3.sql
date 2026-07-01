
-- Step 1: Add new enum values to mentor_status
ALTER TYPE public.mentor_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.mentor_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.mentor_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.mentor_status ADD VALUE IF NOT EXISTS 'rejected';

-- Step 2: Add onboarding fields to mentors table
ALTER TABLE public.mentors
  ADD COLUMN IF NOT EXISTS onboarding_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_current_step text DEFAULT 'profile',
  ADD COLUMN IF NOT EXISTS headline text;

-- Step 3: Create status transition validator
CREATE OR REPLACE FUNCTION public.validate_mentor_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status IN ('pending_review', 'active')) OR
      (OLD.status = 'pending' AND NEW.status IN ('pending_review', 'draft', 'active')) OR
      (OLD.status = 'pending_review' AND NEW.status IN ('active', 'rejected', 'draft')) OR
      (OLD.status = 'active' AND NEW.status IN ('paused', 'suspended')) OR
      (OLD.status = 'paused' AND NEW.status = 'active') OR
      (OLD.status = 'suspended' AND NEW.status = 'active') OR
      (OLD.status = 'rejected' AND NEW.status IN ('draft', 'pending_review'))
    ) THEN
      RAISE EXCEPTION 'Invalid mentor status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_mentor_status_transition ON public.mentors;
CREATE TRIGGER trg_validate_mentor_status_transition
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_mentor_status_transition();
