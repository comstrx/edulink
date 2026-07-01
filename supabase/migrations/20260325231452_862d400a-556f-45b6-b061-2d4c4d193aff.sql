ALTER TABLE public.growth_recommendations
  ADD COLUMN IF NOT EXISTS completion_source_type text,
  ADD COLUMN IF NOT EXISTS completion_source_id text,
  ADD COLUMN IF NOT EXISTS completion_reason_key text,
  ADD COLUMN IF NOT EXISTS completion_metadata jsonb DEFAULT '{}'::jsonb;