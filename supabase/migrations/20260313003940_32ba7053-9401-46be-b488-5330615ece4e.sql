
-- Step 1: Add missing columns to training_items
ALTER TABLE public.training_items
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS duration_hours numeric,
  ADD COLUMN IF NOT EXISTS competency_domain_term_ids uuid[] DEFAULT '{}'::uuid[];

-- Step 2: Performance indexes on scalar columns
CREATE INDEX IF NOT EXISTS idx_training_items_type ON public.training_items (type);
CREATE INDEX IF NOT EXISTS idx_training_items_status ON public.training_items (status);
CREATE INDEX IF NOT EXISTS idx_training_items_created_at ON public.training_items (created_at);
CREATE INDEX IF NOT EXISTS idx_training_items_slug ON public.training_items (slug);
CREATE INDEX IF NOT EXISTS idx_training_items_duration_hours ON public.training_items (duration_hours);

-- Step 3: GIN indexes on taxonomy array columns
CREATE INDEX IF NOT EXISTS idx_training_items_skill_term_ids ON public.training_items USING gin (skill_term_ids);
CREATE INDEX IF NOT EXISTS idx_training_items_subject_term_ids ON public.training_items USING gin (subject_term_ids);
CREATE INDEX IF NOT EXISTS idx_training_items_curriculum_term_ids ON public.training_items USING gin (curriculum_term_ids);
CREATE INDEX IF NOT EXISTS idx_training_items_grade_band_term_ids ON public.training_items USING gin (grade_band_term_ids);
CREATE INDEX IF NOT EXISTS idx_training_items_competency_domain_term_ids ON public.training_items USING gin (competency_domain_term_ids);
