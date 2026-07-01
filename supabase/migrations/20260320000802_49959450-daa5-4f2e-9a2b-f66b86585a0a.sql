
-- Update bootstrap_initial_role to also handle provider org creation
CREATE OR REPLACE FUNCTION public.bootstrap_initial_role(_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _existing_count int;
  _org_id uuid;
  _provider_id uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role NOT IN ('teacher', 'school_admin', 'provider') THEN
    RAISE EXCEPTION 'Invalid initial role: %. Only teacher, school_admin, or provider allowed.', _role;
  END IF;

  -- Idempotency: if user already has roles, skip silently
  SELECT count(*) INTO _existing_count FROM public.user_roles WHERE user_id = _user_id;
  IF _existing_count > 0 THEN
    RETURN;
  END IF;

  -- 1. Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 2. For school_admin: atomically create org + membership
  IF _role = 'school_admin' THEN
    INSERT INTO public.school_organizations (
      name,
      status,
      onboarding_completed
    ) VALUES (
      'My School',
      'active',
      false
    )
    RETURNING id INTO _org_id;

    INSERT INTO public.school_members (
      school_id,
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

  -- 3. For provider: atomically create provider org + membership
  IF _role = 'provider' THEN
    INSERT INTO public.providers (
      display_name,
      status,
      created_by
    ) VALUES (
      'My Organization',
      'draft',
      _user_id
    )
    RETURNING id INTO _provider_id;

    INSERT INTO public.provider_members (
      provider_id,
      user_id,
      role_key,
      status
    ) VALUES (
      _provider_id,
      _user_id,
      'owner',
      'active'
    );
  END IF;
END;
$$;
