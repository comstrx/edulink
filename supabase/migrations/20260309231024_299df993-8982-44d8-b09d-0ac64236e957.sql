
-- GIN indexes for teacher_profiles uuid[] columns used by overlaps() in useTalentSearch
CREATE INDEX IF NOT EXISTS idx_tp_subject_ids_gin ON public.teacher_profiles USING gin (subject_ids);
CREATE INDEX IF NOT EXISTS idx_tp_curriculum_ids_gin ON public.teacher_profiles USING gin (curriculum_ids);
CREATE INDEX IF NOT EXISTS idx_tp_grade_band_ids_gin ON public.teacher_profiles USING gin (grade_band_ids);
CREATE INDEX IF NOT EXISTS idx_tp_certification_ids_gin ON public.teacher_profiles USING gin (certification_ids);
CREATE INDEX IF NOT EXISTS idx_tp_teaching_license_ids_gin ON public.teacher_profiles USING gin (teaching_license_ids);
