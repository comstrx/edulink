ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS salary_min integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS salary_max integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS salary_period text DEFAULT 'monthly';