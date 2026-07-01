
-- ============================================================
-- TRAINING DATA LAYER: Core schema
-- Tables: training_items, training_item_prerequisites,
--         training_package_items, training_pathway_stages
-- ============================================================

-- 1. training_items
CREATE TABLE public.training_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'course',
  title text NOT NULL,
  description text,
  overview text,
  outcomes text[] DEFAULT '{}'::text[],
  syllabus text[] DEFAULT '{}'::text[],
  duration text,
  audience text,
  learning_format_term_id uuid REFERENCES public.taxonomy_terms(id),
  training_level_term_id uuid REFERENCES public.taxonomy_terms(id),
  credential_type_term_id uuid REFERENCES public.taxonomy_terms(id),
  mentor_supported boolean NOT NULL DEFAULT false,
  credential_eligible boolean NOT NULL DEFAULT false,
  subject_term_ids uuid[] DEFAULT '{}'::uuid[],
  skill_term_ids uuid[] DEFAULT '{}'::uuid[],
  grade_band_term_ids uuid[] DEFAULT '{}'::uuid[],
  curriculum_term_ids uuid[] DEFAULT '{}'::uuid[],
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Type validation trigger
CREATE OR REPLACE FUNCTION public.validate_training_item_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('course', 'package', 'pathway') THEN
    RAISE EXCEPTION 'Invalid training item type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_training_item_type
  BEFORE INSERT OR UPDATE ON public.training_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_training_item_type();

-- Status validation trigger
CREATE OR REPLACE FUNCTION public.validate_training_item_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid training item status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_training_item_status
  BEFORE INSERT OR UPDATE ON public.training_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_training_item_status();

-- updated_at trigger
CREATE TRIGGER trg_training_items_updated_at
  BEFORE UPDATE ON public.training_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GIN indexes for array columns
CREATE INDEX idx_training_items_subject_term_ids ON public.training_items USING GIN (subject_term_ids);
CREATE INDEX idx_training_items_skill_term_ids ON public.training_items USING GIN (skill_term_ids);
CREATE INDEX idx_training_items_grade_band_term_ids ON public.training_items USING GIN (grade_band_term_ids);
CREATE INDEX idx_training_items_curriculum_term_ids ON public.training_items USING GIN (curriculum_term_ids);

-- Filtered indexes for common queries
CREATE INDEX idx_training_items_status ON public.training_items (status) WHERE is_active = true;
CREATE INDEX idx_training_items_type ON public.training_items (type) WHERE is_active = true;
CREATE INDEX idx_training_items_slug ON public.training_items (slug);

-- RLS
ALTER TABLE public.training_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published training items"
  ON public.training_items FOR SELECT TO public
  USING (status = 'published' AND is_active = true);

CREATE POLICY "Admins can manage all training items"
  ON public.training_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School admin can manage training items"
  ON public.training_items FOR ALL TO authenticated
  USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'school_admin'));

CREATE POLICY "Academic leads can manage training items"
  ON public.training_items FOR ALL TO authenticated
  USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'school_academic_lead'))
  WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'school_academic_lead'));

-- 2. training_item_prerequisites
CREATE TABLE public.training_item_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_item_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  prerequisite_item_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (training_item_id, prerequisite_item_id)
);

CREATE INDEX idx_prereqs_training_item ON public.training_item_prerequisites (training_item_id);

ALTER TABLE public.training_item_prerequisites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published prereqs"
  ON public.training_item_prerequisites FOR SELECT TO public
  USING (training_item_id IN (SELECT id FROM public.training_items WHERE status = 'published' AND is_active = true));

CREATE POLICY "Admins can manage all prereqs"
  ON public.training_item_prerequisites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School admin can manage own prereqs"
  ON public.training_item_prerequisites FOR ALL TO authenticated
  USING (training_item_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (training_item_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_admin'));

CREATE POLICY "Academic leads can manage own prereqs"
  ON public.training_item_prerequisites FOR ALL TO authenticated
  USING (training_item_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_academic_lead'))
  WITH CHECK (training_item_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_academic_lead'));

-- 3. training_package_items
CREATE TABLE public.training_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, item_id)
);

CREATE INDEX idx_package_items_package ON public.training_package_items (package_id);

ALTER TABLE public.training_package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published package items"
  ON public.training_package_items FOR SELECT TO public
  USING (package_id IN (SELECT id FROM public.training_items WHERE status = 'published' AND is_active = true));

CREATE POLICY "Admins can manage all package items"
  ON public.training_package_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School admin can manage own package items"
  ON public.training_package_items FOR ALL TO authenticated
  USING (package_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (package_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_admin'));

CREATE POLICY "Academic leads can manage own package items"
  ON public.training_package_items FOR ALL TO authenticated
  USING (package_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_academic_lead'))
  WITH CHECK (package_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_academic_lead'));

-- 4. training_pathway_stages
CREATE TABLE public.training_pathway_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  stage_item_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  stage_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pathway_id, stage_item_id)
);

CREATE INDEX idx_pathway_stages_pathway ON public.training_pathway_stages (pathway_id);

ALTER TABLE public.training_pathway_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published pathway stages"
  ON public.training_pathway_stages FOR SELECT TO public
  USING (pathway_id IN (SELECT id FROM public.training_items WHERE status = 'published' AND is_active = true));

CREATE POLICY "Admins can manage all pathway stages"
  ON public.training_pathway_stages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School admin can manage own pathway stages"
  ON public.training_pathway_stages FOR ALL TO authenticated
  USING (pathway_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (pathway_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_admin'));

CREATE POLICY "Academic leads can manage own pathway stages"
  ON public.training_pathway_stages FOR ALL TO authenticated
  USING (pathway_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_academic_lead'))
  WITH CHECK (pathway_id IN (SELECT id FROM public.training_items WHERE created_by = auth.uid()) AND public.has_role(auth.uid(), 'school_academic_lead'));
