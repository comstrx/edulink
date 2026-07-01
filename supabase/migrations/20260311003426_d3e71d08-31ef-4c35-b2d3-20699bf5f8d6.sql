
-- ============================================================
-- TAXONOMY EXPANSION: 6 New Training Domains + Seed Terms
-- SAFE: INSERT-only. No ALTER, UPDATE, DELETE, or DROP.
-- ============================================================

-- 1. Insert new taxonomy_term_types (domains)
INSERT INTO public.taxonomy_term_types (key, name, name_en, is_system_domain, is_active, description)
VALUES
  ('learning_formats',        'Learning Formats',        'Learning Formats',        true, true, 'How training content is delivered (self-paced, cohort, etc.)'),
  ('credential_types',        'Credential Types',        'Credential Types',        true, true, 'Type of professional recognition issued on completion'),
  ('practice_types',          'Practice Types',          'Practice Types',          true, true, 'Categories of hands-on practice tasks'),
  ('evidence_types',          'Evidence Types',          'Evidence Types',          true, true, 'Format of evidence artifacts submitted by teachers'),
  ('mentor_specializations',  'Mentor Specializations',  'Mentor Specializations',  true, true, 'Areas of expertise a mentor can support'),
  ('training_levels',         'Training Levels',         'Training Levels',         true, true, 'Difficulty/experience tiers for training content');

-- 2. Seed terms for learning_formats
INSERT INTO public.taxonomy_terms (name, name_en, slug, term_type_id, sort_order, is_active)
SELECT v.name, v.name, v.slug, tt.id, v.sort_order, true
FROM (VALUES
  ('Self-Paced',                    'self-paced',        1),
  ('Cohort-Based',                  'cohort-based',      2),
  ('Blended (Online + In-Person)',  'blended',           3),
  ('Live Online',                   'live-online',       4),
  ('In-Person',                     'in-person',         5),
  ('Mentor-Led',                    'mentor-led',        6)
) AS v(name, slug, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'learning_formats';

-- 3. Seed terms for credential_types
INSERT INTO public.taxonomy_terms (name, name_en, slug, term_type_id, sort_order, is_active)
SELECT v.name, v.name, v.slug, tt.id, v.sort_order, true
FROM (VALUES
  ('Badge',            'badge',            1),
  ('Certificate',      'certificate',      2),
  ('Micro-Credential', 'micro-credential', 3),
  ('Diploma',          'diploma',          4)
) AS v(name, slug, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'credential_types';

-- 4. Seed terms for practice_types
INSERT INTO public.taxonomy_terms (name, name_en, slug, term_type_id, sort_order, is_active)
SELECT v.name, v.name, v.slug, tt.id, v.sort_order, true
FROM (VALUES
  ('Lesson Plan',          'lesson-plan',          1),
  ('Observation Log',      'observation-log',      2),
  ('Peer Review',          'peer-review',          3),
  ('Classroom Recording',  'classroom-recording',  4),
  ('Action Research',      'action-research',      5),
  ('Reflective Journal',   'reflective-journal',   6)
) AS v(name, slug, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'practice_types';

-- 5. Seed terms for evidence_types
INSERT INTO public.taxonomy_terms (name, name_en, slug, term_type_id, sort_order, is_active)
SELECT v.name, v.name, v.slug, tt.id, v.sort_order, true
FROM (VALUES
  ('Video',         'video',         1),
  ('Document',      'document',      2),
  ('Portfolio',     'portfolio',     3),
  ('Presentation',  'presentation',  4),
  ('Image',         'image',         5),
  ('External Link', 'link',          6)
) AS v(name, slug, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'evidence_types';

-- 6. Seed terms for mentor_specializations
INSERT INTO public.taxonomy_terms (name, name_en, slug, term_type_id, sort_order, is_active)
SELECT v.name, v.name, v.slug, tt.id, v.sort_order, true
FROM (VALUES
  ('Instructional Coaching',   'instructional-coaching',   1),
  ('Curriculum Design',        'curriculum-design',        2),
  ('Assessment Literacy',      'assessment-literacy',      3),
  ('Classroom Management',     'classroom-management',     4),
  ('SEL & Pastoral Care',      'sel-pastoral',             5),
  ('Leadership Development',   'leadership-development',   6),
  ('Inclusion & SEN',          'inclusion-sen',            7),
  ('EdTech Integration',       'edtech-integration',       8)
) AS v(name, slug, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'mentor_specializations';

-- 7. Seed terms for training_levels
INSERT INTO public.taxonomy_terms (name, name_en, slug, term_type_id, sort_order, is_active)
SELECT v.name, v.name, v.slug, tt.id, v.sort_order, true
FROM (VALUES
  ('Beginner',     'beginner',     1),
  ('Intermediate', 'intermediate', 2),
  ('Advanced',     'advanced',     3),
  ('Expert',       'expert',       4)
) AS v(name, slug, sort_order)
CROSS JOIN public.taxonomy_term_types tt
WHERE tt.key = 'training_levels';
