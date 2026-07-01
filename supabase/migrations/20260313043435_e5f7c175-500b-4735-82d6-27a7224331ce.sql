
-- Create assignment status enum
CREATE TYPE public.training_assignment_status AS ENUM (
  'assigned',
  'in_progress',
  'completed',
  'certified',
  'cancelled'
);

-- Create training_assignments table
CREATE TABLE public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  assigned_item_id uuid NOT NULL REFERENCES public.training_items(id) ON DELETE CASCADE,
  assigned_item_type text NOT NULL,
  assigned_to_teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  assigned_by_user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  status public.training_assignment_status NOT NULL DEFAULT 'assigned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_training_assignments_school ON public.training_assignments(school_id);
CREATE INDEX idx_training_assignments_teacher ON public.training_assignments(assigned_to_teacher_id);
CREATE INDEX idx_training_assignments_item ON public.training_assignments(assigned_item_id);
CREATE INDEX idx_training_assignments_status ON public.training_assignments(status);

-- Enable RLS
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything
CREATE POLICY "Admins can manage all training assignments"
  ON public.training_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: School admin/academic_lead can manage assignments for own school
CREATE POLICY "School roles can manage own training assignments"
  ON public.training_assignments FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT sp.id FROM public.school_profiles sp WHERE sp.user_id = auth.uid()
    )
    AND (
      public.has_role(auth.uid(), 'school_admin')
      OR public.has_role(auth.uid(), 'school_academic_lead')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT sp.id FROM public.school_profiles sp WHERE sp.user_id = auth.uid()
    )
    AND (
      public.has_role(auth.uid(), 'school_admin')
      OR public.has_role(auth.uid(), 'school_academic_lead')
    )
  );

-- RLS: Teachers can read their own assignments
CREATE POLICY "Teachers can read own training assignments"
  ON public.training_assignments FOR SELECT
  TO authenticated
  USING (
    assigned_to_teacher_id IN (
      SELECT tp.id FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid()
    )
  );
