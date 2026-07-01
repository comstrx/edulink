
-- STEP 1: Create earned_credentials table
CREATE TABLE public.earned_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  credential_kind text NOT NULL,
  title text NOT NULL,
  issuer_name text NOT NULL DEFAULT 'EduLink Training',
  issued_at timestamptz NOT NULL DEFAULT now(),
  expiry_date date,
  status text NOT NULL DEFAULT 'active',
  verification_code text NOT NULL UNIQUE,
  verification_hash text,
  awarded_by_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- STEP 2: Validation triggers for constrained fields
CREATE OR REPLACE FUNCTION public.validate_earned_credential_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.source_type NOT IN ('training_item', 'training_package', 'training_pathway') THEN
    RAISE EXCEPTION 'Invalid source_type: %. Must be training_item, training_package, or training_pathway.', NEW.source_type;
  END IF;
  IF NEW.credential_kind NOT IN ('badge', 'certificate') THEN
    RAISE EXCEPTION 'Invalid credential_kind: %. Must be badge or certificate.', NEW.credential_kind;
  END IF;
  IF NEW.status NOT IN ('active', 'expired', 'revoked') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be active, expired, or revoked.', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_earned_credential
  BEFORE INSERT OR UPDATE ON public.earned_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_earned_credential_fields();

-- updated_at trigger
CREATE TRIGGER trg_earned_credentials_updated_at
  BEFORE UPDATE ON public.earned_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 5: Duplicate prevention unique index
CREATE UNIQUE INDEX idx_earned_credentials_no_duplicate
  ON public.earned_credentials (teacher_id, source_type, source_id, credential_kind);

-- Lookup indexes
CREATE INDEX idx_earned_credentials_teacher ON public.earned_credentials (teacher_id);
CREATE INDEX idx_earned_credentials_source ON public.earned_credentials (source_type, source_id);
CREATE INDEX idx_earned_credentials_status ON public.earned_credentials (status);
CREATE INDEX idx_earned_credentials_verification ON public.earned_credentials (verification_code);

-- RLS
ALTER TABLE public.earned_credentials ENABLE ROW LEVEL SECURITY;

-- Teachers can read own earned credentials
CREATE POLICY "Teachers can read own earned credentials"
  ON public.earned_credentials FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ));

-- Admins can manage all earned credentials
CREATE POLICY "Admins can manage all earned credentials"
  ON public.earned_credentials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- School roles can read earned credentials for team visibility
CREATE POLICY "School roles can read earned credentials"
  ON public.earned_credentials FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'school_recruiter') OR
    public.has_role(auth.uid(), 'school_academic_lead')
  );

-- Service-level insert for teachers (issuance service writes on behalf)
CREATE POLICY "Authenticated users can insert earned credentials"
  ON public.earned_credentials FOR INSERT TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'));
