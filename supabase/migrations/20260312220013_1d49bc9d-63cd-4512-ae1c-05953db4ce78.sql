
-- Update the application status validation trigger to include 'rejected'
CREATE OR REPLACE FUNCTION public.validate_application_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('applied', 'withdrawn', 'rejected') THEN
    RAISE EXCEPTION 'Invalid application status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;
