-- Delete orphaned terms from the deprecated 'certification' (singular) domain
-- These 8 terms are all inactive and have zero references in teacher_certifications or jobs
DELETE FROM taxonomy_terms
WHERE term_type_id = 'ae28463e-97d1-41df-8dfc-c38e3266674c';

-- Delete the deprecated domain type itself
DELETE FROM taxonomy_term_types
WHERE id = 'ae28463e-97d1-41df-8dfc-c38e3266674c';