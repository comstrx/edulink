/**
 * CRI Data Loader
 *
 * Reads teacher profile, credential counts, and training data
 * from source-of-truth domain tables. Also loads job data if scoped.
 *
 * This is a READ-ONLY layer — no mutations.
 *
 * Phase 3B
 */

import { supabase } from "@/integrations/supabase/client";
import type { CriTeacherData, CriJobData } from "./cri-compute";

export async function loadCriTeacherData(teacherId: string): Promise<CriTeacherData | null> {
  // Load teacher profile
  const { data: profile, error } = await supabase
    .from("teacher_profiles")
    .select("id, full_name, bio, avatar_url, contact_email, cv_url, country_id, city_id, region_id, visa_status_term_id, employment_type_term_ids, work_arrangement_term_ids, language_ids, grade_band_ids, subject_ids, curriculum_ids, certification_ids, years_of_experience, completed_training")
    .eq("id", teacherId)
    .maybeSingle();

  if (error || !profile) {
    console.warn(`[CriDataLoader] Teacher profile not found: ${teacherId}`, error?.message);
    return null;
  }

  // Count credentials (certifications + licenses + degrees)
  const [certsRes, licensesRes, degreesRes] = await Promise.all([
    supabase.from("teacher_certifications").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
    supabase.from("teacher_licenses").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
    supabase.from("teacher_degrees").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
  ]);

  const totalCredentialCount = (certsRes.count ?? 0) + (licensesRes.count ?? 0) + (degreesRes.count ?? 0);

  // For now, verified count is 0 (trust domain integration in future phases)
  const verifiedCredentialCount = 0;

  // Count completed training from the JSONB field
  const completedTraining = profile.completed_training;
  const completedTrainingCount = Array.isArray(completedTraining) ? completedTraining.length : 0;

  return {
    id: profile.id,
    full_name: profile.full_name,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    contact_email: profile.contact_email,
    cv_url: profile.cv_url,
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
    verifiedCredentialCount,
    totalCredentialCount,
    completedTrainingCount,
  };
}

export async function loadCriJobData(jobId: string): Promise<CriJobData | null> {
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, country_term_id, city_term_id, region_term_id, role_category_term_id, role_type_term_id, school_type_term_id, seniority_level_term_id, visa_status_term_ids, employment_type_term_ids, work_arrangement_term_ids, language_term_ids, language_level_term_id, grade_band_term_ids, subject_term_ids, curriculum_term_ids, certification_term_ids, experience_min")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    console.warn(`[CriDataLoader] Job not found: ${jobId}`, error?.message);
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
