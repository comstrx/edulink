
CREATE OR REPLACE FUNCTION public.bootstrap_initial_role(_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _existing_count int;
  _org_id uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role NOT IN ('teacher', 'school_admin', 'provider') THEN
    RAISE EXCEPTION 'Invalid initial role: %. Only teacher, school_admin, or provider allowed.', _role;
  END IF;

  SELECT count(*) INTO _existing_count FROM public.user_roles WHERE user_id = _user_id;
  IF _existing_count > 0 THEN
    RAISE EXCEPTION 'User already has roles assigned. Bootstrap denied.';
  END IF;

  -- 1. Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 2. For school_admin: auto-create organization + membership
  IF _role = 'school_admin' THEN
    INSERT INTO public.school_organizations (
      owner_user_id,
      name,
      status,
      onboarding_completed
    ) VALUES (
      _user_id,
      'My School',
      'active',
      false
    )
    RETURNING id INTO _org_id;

    INSERT INTO public.school_members (
      organization_id,
      user_id,
      role_key,
      status
    ) VALUES (
      _org_id,
      _user_id,
      'school_admin',
      'active'
    );
  END IF;
END;
$$;
