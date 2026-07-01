-- Add completion policy metadata (defaults to simple_completion)
ALTER TABLE public.training_items
  ADD COLUMN IF NOT EXISTS completion_policy jsonb NOT NULL DEFAULT '{"type":"simple_completion"}'::jsonb;

-- Add course structure metadata
ALTER TABLE public.training_items
  ADD COLUMN IF NOT EXISTS course_structure_json jsonb DEFAULT NULL;