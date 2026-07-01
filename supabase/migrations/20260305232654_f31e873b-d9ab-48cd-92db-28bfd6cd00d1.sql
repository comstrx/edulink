
-- STEP B: Migrate taxonomy_term_types to target schema
-- Add bilingual name columns and description
ALTER TABLE public.taxonomy_term_types 
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS description text;

-- Backfill name_en from existing name column
UPDATE public.taxonomy_term_types SET name_en = name WHERE name_en IS NULL;

-- Make name_en NOT NULL after backfill
ALTER TABLE public.taxonomy_term_types ALTER COLUMN name_en SET NOT NULL;

-- Add type_key alias (rename key → type_key would break existing code, so keep 'key' and add a generated column)
-- Actually, 'key' already serves as type_key with UNIQUE constraint. No rename needed to avoid breaking changes.

-- STEP B: Migrate taxonomy_terms to target schema
-- Add bilingual columns, slug, and meta
ALTER TABLE public.taxonomy_terms
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta jsonb;

-- Backfill name_en from name
UPDATE public.taxonomy_terms SET name_en = name WHERE name_en IS NULL;

-- Backfill slug from code (if exists) or generate from name
UPDATE public.taxonomy_terms 
SET slug = COALESCE(
  NULLIF(code, ''), 
  lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
)
WHERE slug IS NULL;

-- Make name_en and slug NOT NULL
ALTER TABLE public.taxonomy_terms ALTER COLUMN name_en SET NOT NULL;
ALTER TABLE public.taxonomy_terms ALTER COLUMN slug SET NOT NULL;

-- Add UNIQUE constraint on (term_type_id, slug) - drop old unique on (term_type_id, name) first
ALTER TABLE public.taxonomy_terms DROP CONSTRAINT IF EXISTS taxonomy_terms_term_type_id_name_key;
ALTER TABLE public.taxonomy_terms ADD CONSTRAINT taxonomy_terms_type_slug_unique UNIQUE (term_type_id, slug);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_term_type_id ON public.taxonomy_terms (term_type_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_parent_id ON public.taxonomy_terms (parent_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_is_active ON public.taxonomy_terms (is_active);

-- STEP B: Create active terms view
CREATE OR REPLACE VIEW public.taxonomy_terms_active AS
SELECT * FROM public.taxonomy_terms WHERE is_active = true;
