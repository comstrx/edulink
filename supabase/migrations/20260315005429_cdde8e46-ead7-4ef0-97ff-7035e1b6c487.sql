CREATE OR REPLACE FUNCTION public.validate_teacher_profile_source()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.profile_source NOT IN ('auth', 'demo') THEN
    RAISE EXCEPTION 'Invalid profile_source: %s. Must be auth or demo.', NEW.profile_source;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_teacher_profile_source
  BEFORE INSERT OR UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_teacher_profile_source();