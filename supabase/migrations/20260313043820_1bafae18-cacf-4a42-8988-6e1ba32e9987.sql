
-- 1. School team members roster table
CREATE TABLE public.school_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.school_profiles(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, teacher_id)
);

ALTER TABLE public.school_team_members ENABLE ROW LEVEL SECURITY;

-- RLS: school admins can manage their own team
CREATE POLICY "School admins can read own team"
  ON public.school_team_members FOR SELECT TO authenticated
  USING (school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid()));

CREATE POLICY "School admins can insert own team"
  ON public.school_team_members FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'school_admin'::app_role)
  );

CREATE POLICY "School admins can delete own team"
  ON public.school_team_members FOR DELETE TO authenticated
  USING (
    school_id IN (SELECT id FROM public.school_profiles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'school_admin'::app_role)
  );

CREATE POLICY "Admins can manage all team members"
  ON public.school_team_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Partial unique index to prevent duplicate active assignments
CREATE UNIQUE INDEX idx_unique_active_assignment
  ON public.training_assignments (school_id, assigned_to_teacher_id, assigned_item_id)
  WHERE status != 'cancelled';

-- 3. Validation trigger for assignment rules
CREATE OR REPLACE FUNCTION public.validate_training_assignment()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_item_type text;
BEGIN
  -- A. Check item exists and get its type
  SELECT type INTO v_item_type
  FROM public.training_items
  WHERE id = NEW.assigned_item_id;

  IF v_item_type IS NULL THEN
    RAISE EXCEPTION 'Assigned item does not exist: %', NEW.assigned_item_id;
  END IF;

  -- B. Only course or pathway allowed
  IF v_item_type NOT IN ('course', 'pathway') THEN
    RAISE EXCEPTION 'Cannot assign item of type "%". Only course and pathway are allowed.', v_item_type;
  END IF;

  -- E. assigned_item_type must match actual item type
  IF NEW.assigned_item_type != v_item_type THEN
    RAISE EXCEPTION 'assigned_item_type "%" does not match actual item type "%"', NEW.assigned_item_type, v_item_type;
  END IF;

  -- C. Teacher must belong to school team
  IF NOT EXISTS (
    SELECT 1 FROM public.school_team_members
    WHERE school_id = NEW.school_id
      AND teacher_id = NEW.assigned_to_teacher_id
  ) THEN
    RAISE EXCEPTION 'Teacher % is not a member of school %', NEW.assigned_to_teacher_id, NEW.school_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_training_assignment
  BEFORE INSERT ON public.training_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_training_assignment();
