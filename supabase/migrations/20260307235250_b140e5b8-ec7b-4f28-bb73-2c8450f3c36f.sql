ALTER TABLE public.school_profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS country_term_id uuid REFERENCES public.taxonomy_terms(id),
  ADD COLUMN IF NOT EXISTS school_type_term_id uuid REFERENCES public.taxonomy_terms(id),
  ADD COLUMN IF NOT EXISTS curriculum_term_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];