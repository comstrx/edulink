
-- Growth Recommendations table — Sprint 7C
-- Persistent lifecycle-tracked recommendations generated from hiring outcomes

CREATE TABLE public.growth_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'rejection_reason',
  source_reference_id uuid,
  source_term_ids text[] NOT NULL DEFAULT '{}',
  recommended_item_id uuid,
  recommended_item_type text,
  recommended_action_type text NOT NULL,
  recommendation_reason text NOT NULL DEFAULT '',
  recommendation_trace jsonb NOT NULL DEFAULT '{}',
  priority_score integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_growth_recommendations_teacher_id ON public.growth_recommendations(teacher_id);
CREATE INDEX idx_growth_recommendations_status ON public.growth_recommendations(status);
CREATE INDEX idx_growth_recommendations_teacher_status ON public.growth_recommendations(teacher_id, status);

-- RLS
ALTER TABLE public.growth_recommendations ENABLE ROW LEVEL SECURITY;

-- Teachers read own
CREATE POLICY "Teachers can read own growth recommendations"
  ON public.growth_recommendations FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT tp.id FROM teacher_profiles tp WHERE tp.user_id = auth.uid()
  ));

-- Teachers can update own (dismiss)
CREATE POLICY "Teachers can update own growth recommendations"
  ON public.growth_recommendations FOR UPDATE TO authenticated
  USING (teacher_id IN (
    SELECT tp.id FROM teacher_profiles tp WHERE tp.user_id = auth.uid()
  ));

-- Authenticated users can insert (for the recommendation engine running client-side)
CREATE POLICY "Authenticated can insert growth recommendations"
  ON public.growth_recommendations FOR INSERT TO authenticated
  WITH CHECK (teacher_id IN (
    SELECT tp.id FROM teacher_profiles tp WHERE tp.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role));

-- Admins full access
CREATE POLICY "Admins can manage all growth recommendations"
  ON public.growth_recommendations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- School roles can read recommendations for applicants
CREATE POLICY "Schools can read applicant growth recommendations"
  ON public.growth_recommendations FOR SELECT TO authenticated
  USING (teacher_id IN (
    SELECT a.teacher_id FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN school_profiles sp ON sp.id = j.school_id
    WHERE sp.user_id = auth.uid()
  ));
