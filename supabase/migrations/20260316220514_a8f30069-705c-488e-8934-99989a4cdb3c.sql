
-- ============================================================
-- Step 2: account_visibility_settings
-- ============================================================

CREATE TABLE public.account_visibility_settings (
  account_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_visibility text NOT NULL DEFAULT 'members_only',
  photo_visibility text NOT NULL DEFAULT 'members_only',
  contact_visibility text NOT NULL DEFAULT 'private',
  credentials_visibility text NOT NULL DEFAULT 'members_only',
  activity_visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_visibility_setting()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  allowed text[] := ARRAY['private', 'members_only', 'schools_only', 'public'];
BEGIN
  IF NEW.profile_visibility != ALL(allowed) THEN
    RAISE EXCEPTION 'Invalid profile_visibility: %', NEW.profile_visibility;
  END IF;
  IF NEW.photo_visibility != ALL(allowed) THEN
    RAISE EXCEPTION 'Invalid photo_visibility: %', NEW.photo_visibility;
  END IF;
  IF NEW.contact_visibility != ALL(allowed) THEN
    RAISE EXCEPTION 'Invalid contact_visibility: %', NEW.contact_visibility;
  END IF;
  IF NEW.credentials_visibility != ALL(allowed) THEN
    RAISE EXCEPTION 'Invalid credentials_visibility: %', NEW.credentials_visibility;
  END IF;
  IF NEW.activity_visibility != ALL(allowed) THEN
    RAISE EXCEPTION 'Invalid activity_visibility: %', NEW.activity_visibility;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_visibility_setting
  BEFORE INSERT OR UPDATE ON public.account_visibility_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_visibility_setting();

-- updated_at trigger
CREATE TRIGGER trg_account_visibility_updated_at
  BEFORE UPDATE ON public.account_visibility_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.account_visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own visibility settings"
  ON public.account_visibility_settings FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY "Users can update own visibility settings"
  ON public.account_visibility_settings FOR UPDATE
  TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

CREATE POLICY "Users can insert own visibility settings"
  ON public.account_visibility_settings FOR INSERT
  TO authenticated
  WITH CHECK (account_id = auth.uid());

-- Step 3: Backfill — idempotent insert for all existing profiles
INSERT INTO public.account_visibility_settings (account_id)
SELECT id FROM public.profiles
ON CONFLICT (account_id) DO NOTHING;

-- ============================================================
-- Step 4: account_verifications
-- ============================================================

CREATE TABLE public.account_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  expires_at timestamptz,
  reviewed_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_verifications_account ON public.account_verifications(account_id);
CREATE UNIQUE INDEX idx_account_verifications_unique_type ON public.account_verifications(account_id, verification_type);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_account_verification()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.verification_type NOT IN (
    'email', 'phone', 'teacher_identity', 'mentor_review',
    'provider_review', 'school_review', 'credential_verification'
  ) THEN
    RAISE EXCEPTION 'Invalid verification_type: %', NEW.verification_type;
  END IF;
  IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Invalid verification status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_account_verification
  BEFORE INSERT OR UPDATE ON public.account_verifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_account_verification();

CREATE TRIGGER trg_account_verifications_updated_at
  BEFORE UPDATE ON public.account_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.account_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own verifications"
  ON public.account_verifications FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

CREATE POLICY "Users can insert own verifications"
  ON public.account_verifications FOR INSERT
  TO authenticated
  WITH CHECK (account_id = auth.uid());
