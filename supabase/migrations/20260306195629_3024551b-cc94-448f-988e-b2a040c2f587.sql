-- Add 4 new taxonomy reference columns to jobs table
ALTER TABLE public.jobs
  ADD COLUMN role_category_term_id uuid REFERENCES public.taxonomy_terms(id),
  ADD COLUMN role_type_term_id uuid REFERENCES public.taxonomy_terms(id),
  ADD COLUMN school_type_term_id uuid REFERENCES public.taxonomy_terms(id),
  ADD COLUMN seniority_level_term_id uuid REFERENCES public.taxonomy_terms(id);

-- Create indexes for filtering performance
CREATE INDEX idx_jobs_role_category_term_id ON public.jobs(role_category_term_id);
CREATE INDEX idx_jobs_role_type_term_id ON public.jobs(role_type_term_id);
CREATE INDEX idx_jobs_school_type_term_id ON public.jobs(school_type_term_id);
CREATE INDEX idx_jobs_seniority_level_term_id ON public.jobs(seniority_level_term_id);