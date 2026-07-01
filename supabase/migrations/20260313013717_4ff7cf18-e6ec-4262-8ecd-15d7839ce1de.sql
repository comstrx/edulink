
-- Create training_completions table as the canonical completion source of truth
CREATE TABLE public.training_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completion_evidence jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for source_type
CREATE OR REPLACE FUNCTION public.validate_training_completion_source_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.source_type NOT IN ('training_item', 'training_package', 'training_pathway') THEN
    RAISE EXCEPTION 'Invalid source_type: %. Must be training_item, training_package, or training_pathway.', NEW.source_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_training_completion
  BEFORE INSERT OR UPDATE ON public.training_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_training_completion_source_type();

-- updated_at trigger
CREATE TRIGGER trg_training_completions_updated_at
  BEFORE UPDATE ON public.training_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent duplicate completions
CREATE UNIQUE INDEX idx_training_completions_no_duplicate
  ON public.training_completions (teacher_id, source_type, source_id);

-- Lookup indexes
CREATE INDEX idx_training_completions_teacher ON public.training_completions (teacher_id);
CREATE INDEX idx_training_completions_source ON public.training_completions (source_type, source_id);

-- RLS
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;

-- Teachers can read own completions
CREATE POLICY "Teachers can read own completions"
  ON public.training_completions FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ));

-- Teachers can insert own completions
CREATE POLICY "Teachers can insert own completions"
  ON public.training_completions FOR INSERT TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ));

-- Admins can manage all completions
CREATE POLICY "Admins can manage all completions"
  ON public.training_completions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- School roles can read completions for team visibility
CREATE POLICY "School roles can read completions"
  ON public.training_completions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'school_recruiter') OR
    public.has_role(auth.uid(), 'school_academic_lead')
  );
