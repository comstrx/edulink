-- Phase 5.3: Add pathway-specific columns to training_items
ALTER TABLE public.training_items
  ADD COLUMN IF NOT EXISTS required_course_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS milestones_json jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reflection_prompts_json jsonb DEFAULT NULL;

-- GIN index for required_course_ids array containment queries
CREATE INDEX IF NOT EXISTS idx_training_items_required_course_ids
  ON public.training_items USING GIN (required_course_ids);

COMMENT ON COLUMN public.training_items.required_course_ids IS 'Pathway: ordered list of required course item IDs';
COMMENT ON COLUMN public.training_items.milestones_json IS 'Pathway: structured milestone definitions (design metadata only)';
COMMENT ON COLUMN public.training_items.reflection_prompts_json IS 'Pathway: structured reflection prompt definitions (design metadata only)';