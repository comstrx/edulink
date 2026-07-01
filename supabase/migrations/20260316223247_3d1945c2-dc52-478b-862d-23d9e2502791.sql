
-- Step 1: Fix visibility validation trigger (incorrect != ALL → correct NOT ANY)
CREATE OR REPLACE FUNCTION public.validate_visibility_setting()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[] := ARRAY['private', 'members_only', 'schools_only', 'public'];
BEGIN
  IF NOT (NEW.profile_visibility = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid profile_visibility: %', NEW.profile_visibility;
  END IF;
  IF NOT (NEW.photo_visibility = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid photo_visibility: %', NEW.photo_visibility;
  END IF;
  IF NOT (NEW.contact_visibility = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid contact_visibility: %', NEW.contact_visibility;
  END IF;
  IF NOT (NEW.credentials_visibility = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid credentials_visibility: %', NEW.credentials_visibility;
  END IF;
  IF NOT (NEW.activity_visibility = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid activity_visibility: %', NEW.activity_visibility;
  END IF;
  RETURN NEW;
END;
$function$;

-- Step 2: Admin RLS policy for account_verifications (full CRUD)
CREATE POLICY "Admins can manage all verifications"
ON public.account_verifications
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
