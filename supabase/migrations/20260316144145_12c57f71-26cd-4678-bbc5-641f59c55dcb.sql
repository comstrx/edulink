
-- Add onboarding columns to providers table
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS onboarding_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_current_step text;

-- Backfill: active providers get onboarding marked complete
UPDATE public.providers
SET onboarding_started_at = created_at,
    onboarding_completed_at = created_at,
    onboarding_current_step = 'complete'
WHERE status = 'active'
  AND onboarding_completed_at IS NULL;

-- Backfill: draft/pending providers get onboarding started
UPDATE public.providers
SET onboarding_started_at = created_at,
    onboarding_current_step = 'profile'
WHERE status IN ('draft', 'pending_review')
  AND onboarding_started_at IS NULL;
