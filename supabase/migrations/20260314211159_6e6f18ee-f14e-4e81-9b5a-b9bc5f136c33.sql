
-- Add review feedback fields to training_items
ALTER TABLE public.training_items
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Validation trigger: require review_notes when rejecting or requesting changes
CREATE OR REPLACE FUNCTION public.validate_review_feedback_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.review_status IS DISTINCT FROM NEW.review_status THEN
    -- When admin sets rejected or changes_requested, review_notes must be provided
    IF NEW.review_status IN ('rejected', 'changes_requested') AND (NEW.review_notes IS NULL OR trim(NEW.review_notes) = '') THEN
      RAISE EXCEPTION 'review_notes is required when setting review_status to %', NEW.review_status;
    END IF;

    -- When approving, rejecting, or requesting changes, set reviewed_at
    IF NEW.review_status IN ('approved', 'rejected', 'changes_requested') THEN
      NEW.reviewed_at = now();
    END IF;

    -- When resubmitting for review, clear reviewer fields but preserve notes
    IF NEW.review_status = 'pending_review' THEN
      NEW.reviewed_by = NULL;
      NEW.reviewed_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_review_feedback
  BEFORE UPDATE ON public.training_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_review_feedback_fields();
