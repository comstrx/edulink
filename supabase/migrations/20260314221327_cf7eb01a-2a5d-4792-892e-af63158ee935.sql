
-- ══════════════════════════════════════════════════════════════
-- Sprint B3-A: Commerce Foundation
-- ══════════════════════════════════════════════════════════════

-- ── Enums ──
CREATE TYPE public.order_status AS ENUM ('pending', 'payment_pending', 'paid', 'cancelled', 'refunded');
CREATE TYPE public.transaction_status AS ENUM ('initiated', 'authorized', 'completed', 'failed', 'refunded');
CREATE TYPE public.order_item_type AS ENUM ('training_course', 'training_package', 'training_pathway', 'mentor_session');

-- ── Orders ──
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'pending',
  currency text NOT NULL DEFAULT 'USD',
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_buyer ON public.orders(buyer_user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers see own orders
CREATE POLICY "Buyers can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

-- Buyers can create orders
CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());

-- Buyers can update own pending orders (cancel)
CREATE POLICY "Buyers can update own orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (buyer_user_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins full access to orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Order Items ──
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_type public.order_item_type NOT NULL,
  item_id uuid NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_price numeric(10,2) NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_item ON public.order_items(item_type, item_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Order items visible to order owner
CREATE POLICY "Buyers can view own order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders WHERE id = order_id AND buyer_user_id = auth.uid()
  ));

CREATE POLICY "Buyers can insert own order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders WHERE id = order_id AND buyer_user_id = auth.uid()
  ));

CREATE POLICY "Admins full access to order items"
  ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── Transactions ──
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_provider text,
  provider_transaction_id text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.transaction_status NOT NULL DEFAULT 'initiated',
  failure_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_order ON public.transactions(order_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders WHERE id = order_id AND buyer_user_id = auth.uid()
  ));

CREATE POLICY "Admins full access to transactions"
  ON public.transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Validation triggers ──

-- Validate order status transitions
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('payment_pending', 'cancelled')) OR
      (OLD.status = 'payment_pending' AND NEW.status IN ('paid', 'cancelled')) OR
      (OLD.status = 'paid' AND NEW.status = 'refunded')
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_status
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();

-- Validate transaction status transitions
CREATE OR REPLACE FUNCTION public.validate_transaction_status_transition()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'initiated' AND NEW.status IN ('authorized', 'completed', 'failed')) OR
      (OLD.status = 'authorized' AND NEW.status IN ('completed', 'failed')) OR
      (OLD.status = 'completed' AND NEW.status = 'refunded')
    ) THEN
      RAISE EXCEPTION 'Invalid transaction status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_transaction_status
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_status_transition();

-- Validate order item references a real item
CREATE OR REPLACE FUNCTION public.validate_order_item()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NEW.item_type IN ('training_course', 'training_package', 'training_pathway') THEN
    SELECT EXISTS (SELECT 1 FROM public.training_items WHERE id = NEW.item_id) INTO v_exists;
    IF NOT v_exists THEN
      RAISE EXCEPTION 'Training item % does not exist', NEW.item_id;
    END IF;
  ELSIF NEW.item_type = 'mentor_session' THEN
    SELECT EXISTS (SELECT 1 FROM public.mentor_sessions WHERE id = NEW.item_id) INTO v_exists;
    IF NOT v_exists THEN
      RAISE EXCEPTION 'Mentor session % does not exist', NEW.item_id;
    END IF;
  END IF;

  -- Validate total_price = unit_price * quantity
  IF NEW.total_price != NEW.unit_price * NEW.quantity THEN
    RAISE EXCEPTION 'total_price must equal unit_price * quantity';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_item
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_item();

-- Optional: link mentor_sessions to orders
ALTER TABLE public.mentor_sessions ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id);
