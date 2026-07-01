/**
 * Match Data Loader
 *
 * Reads teacher profile and job data from source-of-truth domain tables
 * for match score computation. READ-ONLY — no mutations.
 *
 * Phase 3C
 */

import { supabase } from "@/integrations/supabase/client";
import type { TeacherMatchInput, JobMatchInput } from "@/lib/matching";

export async function loadMatchTeacherData(teacherId: string): Promise<(TeacherMatchInput & { id: string }) | null> {
  const { data: profile, error } = await supabase
    .from("teacher_profiles")
    .select("id, country_id, city_id, region_id, visa_status_term_id, employment_type_term_ids, work_arrangement_term_ids, language_ids, grade_band_ids, subject_ids, curriculum_ids, certification_ids, years_of_experience")
    .eq("id", teacherId)
    .maybeSingle();

  if (error || !profile) {
    console.warn(`[MatchDataLoader] Teacher not found: ${teacherId}`, error?.message);
    return null;
  }

  return {
    id: profile.id,
    country_id: profile.country_id,
    city_id: profile.city_id,
    region_id: profile.region_id,
    visa_status_term_id: profile.visa_status_term_id,
    employment_type_term_ids: profile.employment_type_term_ids,
    work_arrangement_term_ids: profile.work_arrangement_term_ids,
    language_ids: profile.language_ids,
    grade_band_ids: profile.grade_band_ids,
    subject_ids: profile.subject_ids,
    curriculum_ids: profile.curriculum_ids,
    certification_ids: profile.certification_ids,
    years_of_experience: profile.years_of_experience,
  };
}

export async function loadMatchJobData(jobId: string): Promise<(JobMatchInput & { id: string }) | null> {
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, country_term_id, city_term_id, region_term_id, role_category_term_id, role_type_term_id, school_type_term_id, seniority_level_term_id, visa_status_term_ids, employment_type_term_ids, work_arrangement_term_ids, language_term_ids, language_level_term_id, grade_band_term_ids, subject_term_ids, curriculum_term_ids, certification_term_ids, experience_min")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    console.warn(`[MatchDataLoader] Job not found: ${jobId}`, error?.message);
    return null;
  }

  return {
    id: job.id,
    country_term_id: job.country_term_id,
    city_term_id: job.city_term_id,
    region_term_id: job.region_term_id,
    role_category_term_id: job.role_category_term_id,
    role_type_term_id: job.role_type_term_id,
    school_type_term_id: job.school_type_term_id,
    seniority_level_term_id: job.seniority_level_term_id,
    visa_status_term_ids: job.visa_status_term_ids,
    employment_type_term_ids: job.employment_type_term_ids,
    work_arrangement_term_ids: job.work_arrangement_term_ids,
    language_term_ids: job.language_term_ids,
    language_level_term_id: job.language_level_term_id,
    grade_band_term_ids: job.grade_band_term_ids,
    subject_term_ids: job.subject_term_ids,
    curriculum_term_ids: job.curriculum_term_ids,
    certification_term_ids: job.certification_term_ids,
    experience_min: job.experience_min,
  };
}
