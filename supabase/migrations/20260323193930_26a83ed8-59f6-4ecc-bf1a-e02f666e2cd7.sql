
CREATE TABLE public.recommendation_feedback_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  recommendation_id text NOT NULL,
  signal_type text NOT NULL,
  action_type text NOT NULL,
  target_resource_id text,
  priority text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for signal_type
CREATE OR REPLACE FUNCTION public.validate_feedback_signal_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.signal_type NOT IN ('recommendation_clicked', 'recommendation_executed') THEN
    RAISE EXCEPTION 'Invalid signal_type: %', NEW.signal_type;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_validate_feedback_signal_type
  BEFORE INSERT ON public.recommendation_feedback_signals
  FOR EACH ROW EXECUTE FUNCTION public.validate_feedback_signal_type();

-- Index for querying by teacher
CREATE INDEX idx_feedback_signals_teacher ON public.recommendation_feedback_signals(teacher_id);

-- RLS
ALTER TABLE public.recommendation_feedback_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert own feedback"
  ON public.recommendation_feedback_signals FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (
      SELECT tp.id FROM public.teacher_profiles tp
      WHERE tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can read own feedback"
  ON public.recommendation_feedback_signals FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT tp.id FROM public.teacher_profiles tp
      WHERE tp.user_id = auth.uid()
    )
  );
