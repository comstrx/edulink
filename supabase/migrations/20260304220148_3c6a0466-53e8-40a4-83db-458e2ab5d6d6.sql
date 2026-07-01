
-- Add new taxonomy term types for teaching licenses, degrees, and languages
INSERT INTO public.taxonomy_term_types (key, name, is_active) VALUES
  ('teaching_licenses', 'Teaching Licenses', true),
  ('degrees', 'Degrees', true),
  ('languages', 'Languages', true)
ON CONFLICT DO NOTHING;

-- Add new columns to teacher_profiles
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS teaching_license_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS degree_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS language_ids uuid[] DEFAULT '{}'::uuid[];

-- Seed teaching license terms
INSERT INTO public.taxonomy_terms (name, term_type_id, sort_order, is_active)
SELECT t.name, tt.id, t.sort_order, true
FROM (VALUES
  ('Licensed', 1),
  ('In Progress', 2),
  ('Not Required', 3)
) AS t(name, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'teaching_licenses';

-- Seed degree terms
INSERT INTO public.taxonomy_terms (name, term_type_id, sort_order, is_active)
SELECT t.name, tt.id, t.sort_order, true
FROM (VALUES
  ('Bachelor', 1),
  ('Master', 2),
  ('PhD', 3),
  ('Diploma', 4)
) AS t(name, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'degrees';

-- Seed language terms
INSERT INTO public.taxonomy_terms (name, term_type_id, sort_order, is_active)
SELECT t.name, tt.id, t.sort_order, true
FROM (VALUES
  ('English', 1),
  ('Arabic', 2),
  ('French', 3),
  ('Spanish', 4),
  ('German', 5),
  ('Mandarin', 6),
  ('Hindi', 7),
  ('Urdu', 8),
  ('Portuguese', 9),
  ('Turkish', 10),
  ('Korean', 11),
  ('Japanese', 12)
) AS t(name, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'languages';
