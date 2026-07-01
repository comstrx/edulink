
-- 1) Add curriculum_experiences term type
INSERT INTO public.taxonomy_term_types (key, name, is_active)
VALUES ('curriculum_experiences', 'Curriculum Experiences', true)
ON CONFLICT DO NOTHING;

-- 2) Seed curriculum experience terms (hierarchical)
DO $$
DECLARE
  _tt_id uuid;
  _brit uuid; _amer uuid; _ib uuid; _camb uuid;
BEGIN
  SELECT id INTO _tt_id FROM public.taxonomy_term_types WHERE key = 'curriculum_experiences';

  -- Parent: British
  INSERT INTO public.taxonomy_terms (term_type_id, name, code, sort_order) VALUES (_tt_id, 'British Curriculum', 'BRIT', 10) RETURNING id INTO _brit;
  INSERT INTO public.taxonomy_terms (term_type_id, name, code, sort_order, parent_id) VALUES
    (_tt_id, 'KS1', 'BRIT_KS1', 11, _brit),
    (_tt_id, 'KS2', 'BRIT_KS2', 12, _brit),
    (_tt_id, 'KS3', 'BRIT_KS3', 13, _brit),
    (_tt_id, 'IGCSE', 'BRIT_IGCSE', 14, _brit),
    (_tt_id, 'A Level', 'BRIT_ALEVEL', 15, _brit);

  -- Parent: American
  INSERT INTO public.taxonomy_terms (term_type_id, name, code, sort_order) VALUES (_tt_id, 'American Curriculum', 'AMER', 20) RETURNING id INTO _amer;
  INSERT INTO public.taxonomy_terms (term_type_id, name, code, sort_order, parent_id) VALUES
    (_tt_id, 'Common Core', 'AMER_CC', 21, _amer),
    (_tt_id, 'AP (Advanced Placement)', 'AMER_AP', 22, _amer),
    (_tt_id, 'NGSS', 'AMER_NGSS', 23, _amer);

  -- Parent: IB
  INSERT INTO public.taxonomy_terms (term_type_id, name, code, sort_order) VALUES (_tt_id, 'IB', 'IB', 30) RETURNING id INTO _ib;
  INSERT INTO public.taxonomy_terms (term_type_id, name, code, sort_order, parent_id) VALUES
    (_tt_id, 'IB PYP', 'IB_PYP', 31, _ib),
    (_tt_id, 'IB MYP', 'IB_MYP', 32, _ib),
    (_tt_id, 'IB DP', 'IB_DP', 33, _ib);

  -- Parent: Cambridge
  INSERT INTO public.taxonomy_terms (term_type_id, name, code, sort_order) VALUES (_tt_id, 'Cambridge', 'CAMB', 40) RETURNING id INTO _camb;
  INSERT INTO public.taxonomy_terms (term_type_id, name, code, sort_order, parent_id) VALUES
    (_tt_id, 'Cambridge Primary', 'CAMB_PRI', 41, _camb),
    (_tt_id, 'Cambridge Lower Secondary', 'CAMB_LSEC', 42, _camb),
    (_tt_id, 'Cambridge IGCSE', 'CAMB_IGCSE', 43, _camb),
    (_tt_id, 'Cambridge A Level', 'CAMB_ALEVEL', 44, _camb);
END $$;

-- 3) Add curriculum_experience_ids column to teacher_profiles
ALTER TABLE public.teacher_profiles
ADD COLUMN IF NOT EXISTS curriculum_experience_ids uuid[] DEFAULT '{}'::uuid[];
