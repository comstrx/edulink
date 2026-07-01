
-- Backfill: insert profiles for any auth users missing one
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create secure initial role bootstrap function
CREATE OR REPLACE FUNCTION public.bootstrap_initial_role(_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _existing_count int;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role NOT IN ('teacher', 'school_admin') THEN
    RAISE EXCEPTION 'Invalid initial role: %. Only teacher or school_admin allowed.', _role;
  END IF;

  SELECT count(*) INTO _existing_count FROM public.user_roles WHERE user_id = _user_id;
  IF _existing_count > 0 THEN
    RAISE EXCEPTION 'User already has roles assigned. Bootstrap denied.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_initial_role(text) TO authenticated;
