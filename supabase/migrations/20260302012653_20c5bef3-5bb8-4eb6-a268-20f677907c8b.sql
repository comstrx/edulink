
-- Create taxonomy_term_types table
CREATE TABLE public.taxonomy_term_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.taxonomy_term_types ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy
CREATE POLICY "Admins can read term types"
  ON public.taxonomy_term_types
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only insert policy
CREATE POLICY "Admins can insert term types"
  ON public.taxonomy_term_types
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin-only update policy
CREATE POLICY "Admins can update term types"
  ON public.taxonomy_term_types
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only delete policy
CREATE POLICY "Admins can delete term types"
  ON public.taxonomy_term_types
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
