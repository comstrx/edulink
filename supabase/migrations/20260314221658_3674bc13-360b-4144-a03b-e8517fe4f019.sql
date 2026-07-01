
-- ══════════════════════════════════════════════════════════════
-- Sprint B3-B: Revenue Distribution Engine
-- ══════════════════════════════════════════════════════════════

-- ── Enums ──
CREATE TYPE public.recipient_type AS ENUM ('platform', 'mentor', 'provider');
CREATE TYPE public.earnings_status AS ENUM ('pending', 'available', 'paid');
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ── Commission Rules ──
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type public.order_item_type NOT NULL,
  platform_percentage numeric(5,2) NOT NULL DEFAULT 0,
  mentor_percentage numeric(5,2) NOT NULL DEFAULT 0,
  provider_percentage numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_type)
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commission rules"
  ON public.commission_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read commission rules"
  ON public.commission_rules FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate percentages sum to 100
CREATE OR REPLACE FUNCTION public.validate_commission_percentages()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF (NEW.platform_percentage + NEW.mentor_percentage + NEW.provider_percentage) != 100 THEN
    RAISE EXCEPTION 'Commission percentages must sum to 100, got %',
      (NEW.platform_percentage + NEW.mentor_percentage + NEW.provider_percentage);
  END IF;
  IF NEW.platform_percentage < 0 OR NEW.mentor_percentage < 0 OR NEW.provider_percentage < 0 THEN
    RAISE EXCEPTION 'Commission percentages must be non-negative';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_commission_percentages
  BEFORE INSERT OR UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_commission_percentages();

-- Seed default commission rules
INSERT INTO public.commission_rules (product_type, platform_percentage, mentor_percentage, provider_percentage) VALUES
  ('mentor_session', 20, 80, 0),
  ('training_course', 100, 0, 0),
  ('training_package', 100, 0, 0),
  ('training_pathway', 100, 0, 0);

-- ── Revenue Ledger (immutable) ──
CREATE TABLE public.revenue_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  recipient_type public.recipient_type NOT NULL,
  recipient_id uuid,
  gross_amount numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenue_ledger_transaction ON public.revenue_ledger(transaction_id);
CREATE INDEX idx_revenue_ledger_recipient ON public.revenue_ledger(recipient_type, recipient_id);

ALTER TABLE public.revenue_ledger ENABLE ROW LEVEL SECURITY;

-- Ledger is admin-only for writes, visible to recipients
CREATE POLICY "Admins full access to revenue ledger"
  ON public.revenue_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Recipients can view own ledger entries"
  ON public.revenue_ledger FOR SELECT TO authenticated
  USING (
    (recipient_type = 'mentor' AND recipient_id IN (
      SELECT id FROM public.mentors WHERE user_id = auth.uid()
    ))
    OR
    (recipient_type = 'provider' AND recipient_id IN (
      SELECT p.id FROM public.providers p
      JOIN public.provider_members pm ON pm.provider_id = p.id
      WHERE pm.user_id = auth.uid()
    ))
  );

-- Immutability: prevent updates and deletes on revenue_ledger
CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'Revenue ledger entries are immutable. Create correction entries instead.';
END;
$$;

CREATE TRIGGER trg_prevent_ledger_update
  BEFORE UPDATE ON public.revenue_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();

CREATE TRIGGER trg_prevent_ledger_delete
  BEFORE DELETE ON public.revenue_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();

-- ── Mentor Earnings ──
CREATE TABLE public.mentor_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE RESTRICT,
  ledger_id uuid NOT NULL REFERENCES public.revenue_ledger(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.earnings_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_earnings_mentor ON public.mentor_earnings(mentor_id);
CREATE INDEX idx_mentor_earnings_status ON public.mentor_earnings(status);

ALTER TABLE public.mentor_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can view own earnings"
  ON public.mentor_earnings FOR SELECT TO authenticated
  USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access to mentor earnings"
  ON public.mentor_earnings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mentor_earnings_updated_at
  BEFORE UPDATE ON public.mentor_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Provider Earnings ──
CREATE TABLE public.provider_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE RESTRICT,
  ledger_id uuid NOT NULL REFERENCES public.revenue_ledger(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.earnings_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_earnings_provider ON public.provider_earnings(provider_id);
CREATE INDEX idx_provider_earnings_status ON public.provider_earnings(status);

ALTER TABLE public.provider_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider members can view earnings"
  ON public.provider_earnings FOR SELECT TO authenticated
  USING (provider_id IN (
    SELECT pm.provider_id FROM public.provider_members pm WHERE pm.user_id = auth.uid()
  ));

CREATE POLICY "Admins full access to provider earnings"
  ON public.provider_earnings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_provider_earnings_updated_at
  BEFORE UPDATE ON public.provider_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Mentor Payouts ──
CREATE TABLE public.mentor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.payout_status NOT NULL DEFAULT 'pending',
  payout_method text,
  external_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_payouts_mentor ON public.mentor_payouts(mentor_id);
CREATE INDEX idx_mentor_payouts_status ON public.mentor_payouts(status);

ALTER TABLE public.mentor_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can view own payouts"
  ON public.mentor_payouts FOR SELECT TO authenticated
  USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access to mentor payouts"
  ON public.mentor_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mentor_payouts_updated_at
  BEFORE UPDATE ON public.mentor_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Provider Payouts ──
CREATE TABLE public.provider_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.payout_status NOT NULL DEFAULT 'pending',
  payout_method text,
  external_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_payouts_provider ON public.provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON public.provider_payouts(status);

ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider members can view payouts"
  ON public.provider_payouts FOR SELECT TO authenticated
  USING (provider_id IN (
    SELECT pm.provider_id FROM public.provider_members pm WHERE pm.user_id = auth.uid()
  ));

CREATE POLICY "Admins full access to provider payouts"
  ON public.provider_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_provider_payouts_updated_at
  BEFORE UPDATE ON public.provider_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Payout status transition validation ──
CREATE OR REPLACE FUNCTION public.validate_payout_status_transition()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('processing', 'failed')) OR
      (OLD.status = 'processing' AND NEW.status IN ('completed', 'failed')) OR
      (OLD.status = 'failed' AND NEW.status = 'pending')
    ) THEN
      RAISE EXCEPTION 'Invalid payout status transition: % -> %', OLD.status, NEW.status;
    END IF;
    IF NEW.status = 'completed' THEN
      NEW.processed_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mentor_payout_status
  BEFORE UPDATE ON public.mentor_payouts
  FOR EACH ROW EXECUTE FUNCTION public.validate_payout_status_transition();

CREATE TRIGGER trg_validate_provider_payout_status
  BEFORE UPDATE ON public.provider_payouts
  FOR EACH ROW EXECUTE FUNCTION public.validate_payout_status_transition();

-- ── Earnings status transition validation ──
CREATE OR REPLACE FUNCTION public.validate_earnings_status_transition()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status = 'available') OR
      (OLD.status = 'available' AND NEW.status = 'paid')
    ) THEN
      RAISE EXCEPTION 'Invalid earnings status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mentor_earnings_status
  BEFORE UPDATE ON public.mentor_earnings
  FOR EACH ROW EXECUTE FUNCTION public.validate_earnings_status_transition();

CREATE TRIGGER trg_validate_provider_earnings_status
  BEFORE UPDATE ON public.provider_earnings
  FOR EACH ROW EXECUTE FUNCTION public.validate_earnings_status_transition();
