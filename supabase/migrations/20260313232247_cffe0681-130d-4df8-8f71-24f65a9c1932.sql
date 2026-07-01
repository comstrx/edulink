
-- Fix overly permissive insert policy: restrict to system trigger context only
DROP POLICY "System can insert executions" ON public.training_executions;

-- Replace with a proper policy that only allows insert if user has a school role
-- (the SECURITY DEFINER trigger handles the actual auto-creation)
CREATE POLICY "School roles can insert executions via assignment"
  ON public.training_executions FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'school_admin') OR 
    has_role(auth.uid(), 'school_training_manager') OR 
    has_role(auth.uid(), 'admin')
  );
