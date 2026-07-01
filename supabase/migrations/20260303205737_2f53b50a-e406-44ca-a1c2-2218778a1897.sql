-- Allow all authenticated and anonymous users to read active taxonomy term types
CREATE POLICY "Anyone can read active term types"
ON public.taxonomy_term_types
FOR SELECT
USING (is_active = true);

-- Allow all authenticated and anonymous users to read active taxonomy terms
CREATE POLICY "Anyone can read active terms"
ON public.taxonomy_terms
FOR SELECT
USING (is_active = true);