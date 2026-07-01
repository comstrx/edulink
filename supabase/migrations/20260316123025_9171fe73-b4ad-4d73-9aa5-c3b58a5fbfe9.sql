ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS preferred_language text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.validate_account_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.account_status NOT IN ('active', 'pending', 'restricted', 'suspended', 'archived') THEN
    RAISE EXCEPTION 'Invalid account_status';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_validate_account_status ON public.profiles;
CREATE TRIGGER trg_validate_account_status
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_account_status();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND email IS NOT DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
    AND account_status IS NOT DISTINCT FROM (SELECT p.account_status FROM public.profiles p WHERE p.id = auth.uid())
  );

UPDATE public.profiles p
  SET display_name = tp.full_name
  FROM public.teacher_profiles tp
  WHERE tp.user_id = p.id
    AND tp.profile_source = 'auth'
    AND tp.full_name IS NOT NULL
    AND tp.full_name != ''
    AND (p.display_name IS NULL OR p.display_name = '');