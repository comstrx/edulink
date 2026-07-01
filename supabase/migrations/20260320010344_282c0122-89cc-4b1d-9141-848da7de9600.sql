
-- ============================================================
-- Legacy FK Migration: school_profiles → school_organizations
-- Order: Drop old FKs → Backfill → Add new FKs
-- ============================================================

-- Step 1: Drop ALL old FKs first
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_school_id_fkey;
ALTER TABLE public.training_assignments DROP CONSTRAINT IF EXISTS training_assignments_school_id_fkey;
ALTER TABLE public.school_team_members DROP CONSTRAINT IF EXISTS school_team_members_school_id_fkey;
ALTER TABLE public.training_executions DROP CONSTRAINT IF EXISTS training_executions_school_id_fkey;
ALTER TABLE public.course_progress DROP CONSTRAINT IF EXISTS course_progress_school_id_fkey;
ALTER TABLE public.compliance_requirements DROP CONSTRAINT IF EXISTS compliance_requirements_school_id_fkey;
ALTER TABLE public.teacher_compliance_status DROP CONSTRAINT IF EXISTS teacher_compliance_status_school_id_fkey;
ALTER TABLE public.department_capability_snapshots DROP CONSTRAINT IF EXISTS department_capability_snapshots_school_id_fkey;
ALTER TABLE public.school_workforce_profiles DROP CONSTRAINT IF EXISTS school_workforce_profiles_school_id_fkey;
ALTER TABLE public.workforce_gap_reports DROP CONSTRAINT IF EXISTS workforce_gap_reports_school_id_fkey;
ALTER TABLE public.promotion_readiness_entries DROP CONSTRAINT IF EXISTS promotion_readiness_entries_school_id_fkey;

-- Step 2: Backfill existing rows (remap legacy profile IDs → org IDs)
UPDATE public.jobs j
SET school_id = so.id
FROM public.school_organizations so
WHERE so.legacy_school_profile_id = j.school_id
  AND so.legacy_school_profile_id IS NOT NULL;

UPDATE public.training_assignments ta
SET school_id = so.id
FROM public.school_organizations so
WHERE so.legacy_school_profile_id = ta.school_id
  AND so.legacy_school_profile_id IS NOT NULL;

UPDATE public.school_team_members stm
SET school_id = so.id
FROM public.school_organizations so
WHERE so.legacy_school_profile_id = stm.school_id
  AND so.legacy_school_profile_id IS NOT NULL;

UPDATE public.training_executions te
SET school_id = so.id
FROM public.school_organizations so
WHERE so.legacy_school_profile_id = te.school_id
  AND so.legacy_school_profile_id IS NOT NULL;

UPDATE public.course_progress cp
SET school_id = so.id
FROM public.school_organizations so
WHERE so.legacy_school_profile_id = cp.school_id
  AND so.legacy_school_profile_id IS NOT NULL;

-- Step 3: Add new FKs pointing to school_organizations
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.training_assignments
  ADD CONSTRAINT training_assignments_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.school_team_members
  ADD CONSTRAINT school_team_members_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.training_executions
  ADD CONSTRAINT training_executions_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.course_progress
  ADD CONSTRAINT course_progress_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.compliance_requirements
  ADD CONSTRAINT compliance_requirements_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.teacher_compliance_status
  ADD CONSTRAINT teacher_compliance_status_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.department_capability_snapshots
  ADD CONSTRAINT department_capability_snapshots_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.school_workforce_profiles
  ADD CONSTRAINT school_workforce_profiles_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.workforce_gap_reports
  ADD CONSTRAINT workforce_gap_reports_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

ALTER TABLE public.promotion_readiness_entries
  ADD CONSTRAINT promotion_readiness_entries_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.school_organizations(id);

-- Step 4: Also update the validate_training_assignment function
-- to reference school_team_members which now points to school_organizations
-- (No change needed — it already checks school_team_members.school_id which
--  will now correctly resolve to org IDs)
