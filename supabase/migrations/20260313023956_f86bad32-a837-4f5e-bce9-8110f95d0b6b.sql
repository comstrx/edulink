
-- Phase 5.2: Package Model Extension
-- Add pricing and targeting metadata to training_items for package support

ALTER TABLE public.training_items
  ADD COLUMN IF NOT EXISTS pricing_type text NULL,
  ADD COLUMN IF NOT EXISTS price_amount numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS price_currency text NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS target_segment_term_ids uuid[] NULL DEFAULT '{}';

-- Validation trigger for pricing_type
CREATE OR REPLACE FUNCTION public.validate_training_item_pricing()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only validate pricing fields when they are set
  IF NEW.pricing_type IS NOT NULL AND NEW.pricing_type NOT IN ('fixed', 'custom', 'contact_sales', 'included_in_plan') THEN
    RAISE EXCEPTION 'Invalid pricing_type: %. Must be fixed, custom, contact_sales, or included_in_plan.', NEW.pricing_type;
  END IF;
  
  -- price_amount must be non-negative if set
  IF NEW.price_amount IS NOT NULL AND NEW.price_amount < 0 THEN
    RAISE EXCEPTION 'price_amount must be non-negative';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_training_item_pricing_trigger
  BEFORE INSERT OR UPDATE ON public.training_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_training_item_pricing();

-- Column comments
COMMENT ON COLUMN public.training_items.pricing_type IS 'Package metadata: commercial pricing mode (fixed, custom, contact_sales, included_in_plan)';
COMMENT ON COLUMN public.training_items.price_amount IS 'Package metadata: monetary price amount, only meaningful when pricing_type = fixed';
COMMENT ON COLUMN public.training_items.price_currency IS 'Package metadata: ISO currency code (text, not taxonomy — no currency taxonomy exists yet)';
COMMENT ON COLUMN public.training_items.target_segment_term_ids IS 'Package metadata: taxonomy IDs for target audience segments';

-- GIN index for target_segment_term_ids filtering
CREATE INDEX IF NOT EXISTS idx_training_items_target_segment_term_ids
  ON public.training_items USING gin (target_segment_term_ids);
