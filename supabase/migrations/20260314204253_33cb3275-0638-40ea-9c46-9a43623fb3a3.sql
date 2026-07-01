
-- Provider type enum
CREATE TYPE public.provider_type AS ENUM (
  'training_provider',
  'certification_body',
  'mentor_org',
  'publisher_partner'
);

-- Provider status enum
CREATE TYPE public.provider_status AS ENUM (
  'draft',
  'pending_review',
  'active',
  'rejected',
  'suspended',
  'inactive'
);

-- Provider verification status enum
CREATE TYPE public.provider_verification_status AS ENUM (
  'unverified',
  'verified'
);

-- Provider member role enum
CREATE TYPE public.provider_member_role AS ENUM (
  'owner',
  'admin',
  'editor',
  'finance',
  'mentor_manager'
);

-- Provider member status enum
CREATE TYPE public.provider_member_status AS ENUM (
  'invited',
  'active',
  'inactive'
);

-- Providers table
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.provider_type NOT NULL DEFAULT 'training_provider',
  legal_name text NOT NULL,
  display_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  cover_url text,
  bio text,
  website_url text,
  contact_email text,
  country_term_id uuid REFERENCES public.taxonomy_terms(id),
  city_term_id uuid REFERENCES public.taxonomy_terms(id),
  status public.provider_status NOT NULL DEFAULT 'draft',
  verification_status public.provider_verification_status NOT NULL DEFAULT 'unverified',
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Provider members table
CREATE TABLE public.provider_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.provider_member_role NOT NULL DEFAULT 'editor',
  status public.provider_member_status NOT NULL DEFAULT 'invited',
  invited_by uuid,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, user_id)
);

-- Indexes
CREATE INDEX providers_status_idx ON public.providers(status);
CREATE INDEX providers_type_idx ON public.providers(type);
CREATE INDEX providers_slug_idx ON public.providers(slug);
CREATE INDEX provider_members_provider_idx ON public.provider_members(provider_id);
CREATE INDEX provider_members_user_idx ON public.provider_members(user_id);

-- Updated_at triggers
CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_members_updated_at
  BEFORE UPDATE ON public.provider_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add provider to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';

-- RLS: providers
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_providers"
  ON public.providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "members_read_own_provider"
  ON public.providers FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT provider_id FROM public.provider_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS: provider_members
ALTER TABLE public.provider_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_provider_members"
  ON public.provider_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "members_read_own_provider_members"
  ON public.provider_members FOR SELECT TO authenticated
  USING (
    provider_id IN (
      SELECT provider_id FROM public.provider_members pm
      WHERE pm.user_id = auth.uid() AND pm.status = 'active'
    )
  );

CREATE POLICY "self_read_own_membership"
  ON public.provider_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
