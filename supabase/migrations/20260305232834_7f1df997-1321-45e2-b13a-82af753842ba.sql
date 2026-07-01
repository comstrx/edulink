
-- Add visa_status domain type (missing from current 23 types)
INSERT INTO public.taxonomy_term_types (key, name, name_en, is_active)
VALUES ('visa_status', 'Visa Status', 'Visa Status', true)
ON CONFLICT (key) DO NOTHING;
