
-- Create teacher_languages relational table for language-level pairs
CREATE TABLE public.teacher_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  language_term_id UUID NOT NULL REFERENCES public.taxonomy_terms(id),
  language_level_term_id UUID REFERENCES public.taxonomy_terms(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, language_term_id)
);

-- Enable RLS
ALTER TABLE public.teacher_languages ENABLE ROW LEVEL SECURITY;

-- Teachers can read own language entries
CREATE POLICY "Teachers can read own languages"
  ON public.teacher_languages FOR SELECT
  USING (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  ));

-- Teachers can insert own language entries
CREATE POLICY "Teachers can insert own languages"
  ON public.teacher_languages FOR INSERT
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- Teachers can update own language entries
CREATE POLICY "Teachers can update own languages"
  ON public.teacher_languages FOR UPDATE
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- Teachers can delete own language entries
CREATE POLICY "Teachers can delete own languages"
  ON public.teacher_languages FOR DELETE
  USING (
    teacher_id IN (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- School roles can read all (for talent search)
CREATE POLICY "School roles can read all teacher languages"
  ON public.teacher_languages FOR SELECT
  USING (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'school_recruiter'::app_role)
    OR has_role(auth.uid(), 'school_academic_lead'::app_role)
  );

-- Admins can manage all
CREATE POLICY "Admins can manage all teacher languages"
  ON public.teacher_languages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public profiles: language data readable
CREATE POLICY "Public profiles languages readable"
  ON public.teacher_languages FOR SELECT
  USING (teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE is_public_profile = true
  ));

-- Auto-update updated_at
CREATE TRIGGER update_teacher_languages_updated_at
  BEFORE UPDATE ON public.teacher_languages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_teacher_languages_teacher_id ON public.teacher_languages(teacher_id);
CREATE INDEX idx_teacher_languages_language_term_id ON public.teacher_languages(language_term_id);
