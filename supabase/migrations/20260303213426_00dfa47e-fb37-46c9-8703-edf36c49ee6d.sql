-- Fix taxonomy_term_types: drop restrictive policy, recreate as permissive
DROP POLICY IF EXISTS "Anyone can read active term types" ON public.taxonomy_term_types;
CREATE POLICY "Anyone can read active term types"
  ON public.taxonomy_term_types
  FOR SELECT
  TO public
  USING (is_active = true);

-- Fix taxonomy_terms: drop restrictive policy, recreate as permissive
DROP POLICY IF EXISTS "Anyone can read active terms" ON public.taxonomy_terms;
CREATE POLICY "Anyone can read active terms"
  ON public.taxonomy_terms
  FOR SELECT
  TO public
  USING (is_active = true);