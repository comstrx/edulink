
-- Sprint B2-C: Mentor Session Reviews (reputation system)
-- Separate from evidence-based mentor_reviews — this is for session-based ratings

CREATE TABLE IF NOT EXISTS public.mentor_session_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mentor_session_reviews_unique_review UNIQUE (session_id, reviewer_user_id)
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_mentor_session_review_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid mentor session review status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mentor_session_review_status
  BEFORE INSERT OR UPDATE ON public.mentor_session_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_mentor_session_review_status();

-- Validation: ensure session is completed and reviewer is the booking teacher
CREATE OR REPLACE FUNCTION public.validate_mentor_session_review()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_session record;
  v_teacher_user_id uuid;
BEGIN
  -- Get session
  SELECT status, mentor_id, teacher_id INTO v_session
    FROM public.mentor_sessions WHERE id = NEW.session_id;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session does not exist';
  END IF;

  IF v_session.status != 'completed' THEN
    RAISE EXCEPTION 'Can only review completed sessions (current: %)', v_session.status;
  END IF;

  IF v_session.mentor_id != NEW.mentor_id THEN
    RAISE EXCEPTION 'Mentor ID does not match session';
  END IF;

  -- Ensure reviewer is the teacher who booked the session
  SELECT user_id INTO v_teacher_user_id
    FROM public.teacher_profiles WHERE id = v_session.teacher_id;

  IF v_teacher_user_id IS NULL OR v_teacher_user_id != NEW.reviewer_user_id THEN
    RAISE EXCEPTION 'Only the session booking teacher can submit a review';
  END IF;

  -- Ensure mentor is not reviewing themselves
  IF EXISTS (SELECT 1 FROM public.mentors WHERE id = NEW.mentor_id AND user_id = NEW.reviewer_user_id) THEN
    RAISE EXCEPTION 'Mentor cannot review themselves';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mentor_session_review
  BEFORE INSERT ON public.mentor_session_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_mentor_session_review();

-- Updated_at trigger
CREATE TRIGGER trg_mentor_session_reviews_updated_at
  BEFORE UPDATE ON public.mentor_session_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.mentor_session_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews for active mentors
CREATE POLICY "Public can read approved reviews" ON public.mentor_session_reviews
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- Authenticated users can read their own reviews (any status)
CREATE POLICY "Users can read own reviews" ON public.mentor_session_reviews
  FOR SELECT TO authenticated
  USING (reviewer_user_id = auth.uid());

-- Authenticated users can insert reviews
CREATE POLICY "Authenticated users can create reviews" ON public.mentor_session_reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_user_id = auth.uid());

-- Admins can update reviews (moderate)
CREATE POLICY "Admins can update reviews" ON public.mentor_session_reviews
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can read all reviews
CREATE POLICY "Admins can read all reviews" ON public.mentor_session_reviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
