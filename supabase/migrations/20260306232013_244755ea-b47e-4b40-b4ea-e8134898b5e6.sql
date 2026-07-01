
-- 1. Deactivate corporate terms NOT in use by any jobs
UPDATE taxonomy_terms SET is_active = false WHERE id IN (
  '3496fd92-1e5b-4e1d-bfbd-78967a9f2a44',
  'bcae4427-7a4e-4fb0-85f9-ac5f9626f7bc',
  '417aff50-733f-4945-a124-b1687fca8084'
);

-- 2. Rename existing active terms to school-friendly labels
UPDATE taxonomy_terms SET name = 'Entry (0–1 years)', name_en = 'Entry (0–1 years)', name_ar = 'مبتدئ (0–1 سنة)' WHERE id = 'a4a0fb7e-50fc-402d-a6c5-2f5147ab40c8';
UPDATE taxonomy_terms SET name = 'Junior (1–3 years)', name_en = 'Junior (1–3 years)', name_ar = 'مبتدئ متقدم (1–3 سنوات)' WHERE id = '67c5951c-efad-43e6-9437-5c76c5f479e9';
UPDATE taxonomy_terms SET name = 'Experienced (3–5 years)', name_en = 'Experienced (3–5 years)', name_ar = 'ذو خبرة (3–5 سنوات)' WHERE id = '70c9dce7-0221-49ab-92c4-48e7d37ad594';
UPDATE taxonomy_terms SET name = 'Senior (5+ years)', name_en = 'Senior (5+ years)', name_ar = 'خبير (5+ سنوات)' WHERE id = 'f980e09b-914c-4b62-91fb-3331a1673da6';

-- 3. Add new school-friendly term: Leadership
INSERT INTO taxonomy_terms (name, name_en, name_ar, slug, term_type_id, sort_order, is_active)
SELECT 'Leadership', 'Leadership', 'قيادة', 'leadership',
  tt.id, 5, true
FROM taxonomy_term_types tt WHERE tt.key = 'seniority_levels';
