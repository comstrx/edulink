
-- ══════════════════════════════════════════════════════════════
-- Sprint B3-C: Marketplace Billing & Pricing Layer
-- ══════════════════════════════════════════════════════════════

-- ── Mentor Pricing Fields ──
ALTER TABLE public.mentors
  ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS session_price_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_price_currency text DEFAULT 'USD';

-- Validate mentor pricing_type
CREATE OR REPLACE FUNCTION public.validate_mentor_pricing()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pricing_type NOT IN ('free', 'one_time', 'contact_sales', 'custom_quote') THEN
    RAISE EXCEPTION 'Invalid mentor pricing_type: %', NEW.pricing_type;
  END IF;
  IF NEW.pricing_type = 'one_time' AND (NEW.session_price_amount IS NULL OR NEW.session_price_amount <= 0) THEN
    RAISE EXCEPTION 'session_price_amount must be positive when pricing_type is one_time';
  END IF;
  IF NEW.pricing_type = 'free' THEN
    NEW.session_price_amount = 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mentor_pricing
  BEFORE INSERT OR UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.validate_mentor_pricing();

-- ── Billing Policies ──
CREATE TABLE public.billing_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key text NOT NULL UNIQUE,
  product_type text NOT NULL,
  pricing_mode text NOT NULL DEFAULT 'free',
  currency text NOT NULL DEFAULT 'USD',
  purchasable_online boolean NOT NULL DEFAULT false,
  requires_manual_approval boolean NOT NULL DEFAULT false,
  ownership_context text NOT NULL DEFAULT 'platform',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read billing policies"
  ON public.billing_policies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage billing policies"
  ON public.billing_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_billing_policies_updated_at
  BEFORE UPDATE ON public.billing_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate billing policy pricing_mode
CREATE OR REPLACE FUNCTION public.validate_billing_policy()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pricing_mode NOT IN ('free', 'one_time', 'contact_sales', 'custom_quote', 'subscription') THEN
    RAISE EXCEPTION 'Invalid pricing_mode: %', NEW.pricing_mode;
  END IF;
  IF NEW.ownership_context NOT IN ('platform', 'provider', 'mentor') THEN
    RAISE EXCEPTION 'Invalid ownership_context: %', NEW.ownership_context;
  END IF;
  -- Free items are always accessible online (no payment needed)
  IF NEW.pricing_mode = 'free' THEN
    NEW.purchasable_online = true;
    NEW.requires_manual_approval = false;
  END IF;
  -- contact_sales and custom_quote are never directly purchasable
  IF NEW.pricing_mode IN ('contact_sales', 'custom_quote') THEN
    NEW.purchasable_online = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_billing_policy
  BEFORE INSERT OR UPDATE ON public.billing_policies
  FOR EACH ROW EXECUTE FUNCTION public.validate_billing_policy();

-- Seed default billing policies
INSERT INTO public.billing_policies (policy_key, product_type, pricing_mode, purchasable_online, ownership_context) VALUES
  ('platform_course_free', 'training_course', 'free', true, 'platform'),
  ('platform_course_paid', 'training_course', 'one_time', true, 'platform'),
  ('provider_course_paid', 'training_course', 'one_time', true, 'provider'),
  ('provider_package_paid', 'training_package', 'one_time', true, 'provider'),
  ('provider_package_contact', 'training_package', 'contact_sales', false, 'provider'),
  ('platform_pathway_free', 'training_pathway', 'free', true, 'platform'),
  ('mentor_session_free', 'mentor_session', 'free', true, 'mentor'),
  ('mentor_session_paid', 'mentor_session', 'one_time', true, 'mentor'),
  ('mentor_session_contact', 'mentor_session', 'contact_sales', false, 'mentor'),
  ('school_plan_subscription', 'school_plan', 'subscription', false, 'platform');

-- Also normalize training_items pricing_type to include 'free' and 'one_time' 
-- (existing values: fixed, custom, contact_sales, included_in_plan)
-- We keep backward compat — the validate_training_item_pricing trigger already allows these.
