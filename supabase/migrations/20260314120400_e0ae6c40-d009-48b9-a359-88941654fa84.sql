
-- Sprint 8A: Career Path System

-- Career Paths (track families)
CREATE TABLE public.career_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.career_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read career paths"
  ON public.career_paths FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage career paths"
  ON public.career_paths FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Career Stages (steps within a path)
CREATE TABLE public.career_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.career_paths(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  stage_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, slug)
);

ALTER TABLE public.career_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read career stages"
  ON public.career_stages FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage career stages"
  ON public.career_stages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Career Stage Requirements
CREATE TABLE public.career_stage_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.career_stages(id) ON DELETE CASCADE,
  requirement_type text NOT NULL,
  requirement_key text NOT NULL,
  requirement_label text NOT NULL,
  term_ids text[] NOT NULL DEFAULT '{}',
  min_count integer DEFAULT 1,
  min_experience_years integer,
  is_mandatory boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.career_stage_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read stage requirements"
  ON public.career_stage_requirements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage stage requirements"
  ON public.career_stage_requirements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teacher Career States (snapshot of evaluated state)
CREATE TABLE public.teacher_career_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  current_path_id uuid REFERENCES public.career_paths(id),
  current_stage_id uuid REFERENCES public.career_stages(id),
  next_stage_id uuid REFERENCES public.career_stages(id),
  readiness_percent numeric NOT NULL DEFAULT 0,
  unmet_requirement_count integer NOT NULL DEFAULT 0,
  satisfied_requirement_count integer NOT NULL DEFAULT 0,
  total_requirement_count integer NOT NULL DEFAULT 0,
  evaluation_trace jsonb NOT NULL DEFAULT '{}',
  engine_version text NOT NULL DEFAULT '8a.1',
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id)
);

ALTER TABLE public.teacher_career_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read own career state"
  ON public.teacher_career_states FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Schools can read applicant career states"
  ON public.teacher_career_states FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT a.teacher_id FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN school_profiles sp ON sp.id = j.school_id
    WHERE sp.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage career states"
  ON public.teacher_career_states FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage career states"
  ON public.teacher_career_states FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teacher Career Goals
CREATE TABLE public.teacher_career_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  target_path_id uuid NOT NULL REFERENCES public.career_paths(id),
  target_stage_id uuid NOT NULL REFERENCES public.career_stages(id),
  goal_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_career_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own career goals"
  ON public.teacher_career_goals FOR ALL TO authenticated
  USING (teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all career goals"
  ON public.teacher_career_goals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial career paths and stages
INSERT INTO public.career_paths (slug, name, description, sort_order) VALUES
  ('teaching', 'Teaching Track', 'Progress through classroom teaching roles', 1),
  ('leadership', 'Leadership Track', 'Move into educational leadership positions', 2),
  ('coaching', 'Coaching Track', 'Become an instructional coach or mentor', 3);

-- Teaching Track stages
INSERT INTO public.career_stages (path_id, slug, name, description, stage_order)
SELECT p.id, s.slug, s.name, s.description, s.stage_order
FROM public.career_paths p
CROSS JOIN (VALUES
  ('assistant-teacher', 'Assistant Teacher', 'Entry-level classroom support role', 1),
  ('classroom-teacher', 'Classroom Teacher', 'Independent classroom teaching', 2),
  ('senior-teacher', 'Senior Teacher', 'Experienced teacher with mentoring responsibilities', 3),
  ('lead-teacher', 'Lead Teacher', 'Department or subject lead with curriculum oversight', 4)
) AS s(slug, name, description, stage_order)
WHERE p.slug = 'teaching';

-- Leadership Track stages
INSERT INTO public.career_stages (path_id, slug, name, description, stage_order)
SELECT p.id, s.slug, s.name, s.description, s.stage_order
FROM public.career_paths p
CROSS JOIN (VALUES
  ('classroom-teacher-l', 'Classroom Teacher', 'Foundation teaching experience', 1),
  ('subject-lead', 'Subject Lead', 'Lead a subject area or department', 2),
  ('academic-coordinator', 'Academic Coordinator', 'Coordinate academic programs across departments', 3),
  ('head-of-department', 'Head of Department', 'Full departmental leadership', 4)
) AS s(slug, name, description, stage_order)
WHERE p.slug = 'leadership';

-- Coaching Track stages
INSERT INTO public.career_stages (path_id, slug, name, description, stage_order)
SELECT p.id, s.slug, s.name, s.description, s.stage_order
FROM public.career_paths p
CROSS JOIN (VALUES
  ('classroom-teacher-c', 'Classroom Teacher', 'Foundation teaching experience', 1),
  ('peer-mentor', 'Peer Mentor', 'Support colleagues through peer mentoring', 2),
  ('instructional-coach', 'Instructional Coach', 'Full-time instructional coaching role', 3)
) AS s(slug, name, description, stage_order)
WHERE p.slug = 'coaching';
