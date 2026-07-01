
-- Create taxonomy_terms table
CREATE TABLE public.taxonomy_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_type_id UUID NOT NULL REFERENCES public.taxonomy_term_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  parent_id UUID REFERENCES public.taxonomy_terms(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (term_type_id, name)
);

-- Enable RLS
ALTER TABLE public.taxonomy_terms ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can read terms"
  ON public.taxonomy_terms FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert terms"
  ON public.taxonomy_terms FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update terms"
  ON public.taxonomy_terms FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete terms"
  ON public.taxonomy_terms FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
