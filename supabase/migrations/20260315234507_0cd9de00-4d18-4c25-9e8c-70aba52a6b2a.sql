
-- Step 1: Add training_execution_id to mentor_sessions (nullable FK)
ALTER TABLE public.mentor_sessions
  ADD COLUMN training_execution_id uuid REFERENCES public.training_executions(id) ON DELETE SET NULL;

-- Add index for lookup
CREATE INDEX idx_mentor_sessions_training_execution_id
  ON public.mentor_sessions(training_execution_id)
  WHERE training_execution_id IS NOT NULL;
