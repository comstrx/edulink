
-- 1) Create opportunity_types taxonomy term type
INSERT INTO public.taxonomy_term_types (key, name, name_en, name_ar, description, is_active)
VALUES ('opportunity_types', 'Opportunity Types', 'Opportunity Types', 'أنواع الفرص', 'Types of teaching opportunities', true)
ON CONFLICT DO NOTHING;

-- 2) Add opportunity_type_ids uuid[] column
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS opportunity_type_ids uuid[] DEFAULT '{}'::uuid[];

-- 3) Drop old text[] column  
ALTER TABLE public.teacher_profiles DROP COLUMN IF EXISTS opportunity_types;
