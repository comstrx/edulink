
-- School invitations table for team invite flow
CREATE TABLE public.school_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.school_organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, email, status)
);

-- Validate invitation fields
CREATE OR REPLACE FUNCTION public.validate_school_invitation()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role_key NOT IN ('school_admin', 'school_recruiter', 'school_academic_lead', 'school_training_manager') THEN
    RAISE EXCEPTION 'Invalid invitation role_key: only school roles allowed';
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid invitation status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_school_invitation
  BEFORE INSERT OR UPDATE ON public.school_invitations
  FOR EACH ROW EXECUTE FUNCTION public.validate_school_invitation();

-- updated_at trigger
CREATE TRIGGER trg_school_invitations_updated_at
  BEFORE UPDATE ON public.school_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.school_invitations ENABLE ROW LEVEL SECURITY;

-- School admins can manage invitations for their school
CREATE POLICY "School admins can manage invitations"
  ON public.school_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = school_invitations.school_id
        AND sm.user_id = auth.uid()
        AND sm.role_key = 'school_admin'
        AND sm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = school_invitations.school_id
        AND sm.user_id = auth.uid()
        AND sm.role_key = 'school_admin'
        AND sm.status = 'active'
    )
  );

-- Invited users can read their own invitations
CREATE POLICY "Users can read own invitations by email"
  ON public.school_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
