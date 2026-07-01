/**
 * Gap Data Loader
 *
 * Reads teacher profile, credentials, and optionally job requirements
 * to feed the gap detection engine. READ-ONLY.
 *
 * Phase 3D
 */

import { supabase } from "@/integrations/supabase/client";

export interface GapTeacherData {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  cv_url: string | null;
  country_id: string | null;
  city_id: string | null;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  certification_ids: string[] | null;
  language_ids: string[] | null;
  grade_band_ids: string[] | null;
  years_of_experience: number | null;
  /** Skill term IDs from relational table */
  skillTermIds: string[];
  /** Certification term IDs from relational table */
  certificationTermIds: string[];
  /** Completed training count */
  completedTrainingCount: number;
}

export interface GapJobData {
  id: string;
  subject_term_ids: string[] | null;
  curriculum_term_ids: string[] | null;
  certification_term_ids: string[] | null;
  language_term_ids: string[] | null;
  grade_band_term_ids: string[] | null;
  experience_min: number | null;
  /** Skill term IDs from relational table */
  skillTermIds: string[];
}

export async function loadGapTeacherData(teacherId: string): Promise<GapTeacherData | null> {
  const [profileRes, skillsRes, certsRes] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("id, full_name, bio, avatar_url, contact_email, cv_url, country_id, city_id, subject_ids, curriculum_ids, certification_ids, language_ids, grade_band_ids, years_of_experience, completed_training")
      .eq("id", teacherId)
      .maybeSingle(),
    supabase
      .from("teacher_skills")
      .select("skill_term_id")
      .eq("teacher_id", teacherId),
    supabase
      .from("teacher_certifications")
      .select("certification_term_id")
      .eq("teacher_id", teacherId),
  ]);

  if (profileRes.error || !profileRes.data) {
    console.warn(`[GapDataLoader] Teacher not found: ${teacherId}`);
    return null;
  }

  const p = profileRes.data;
  const completedTraining = p.completed_training;

  return {
    id: p.id,
    full_name: p.full_name,
    bio: p.bio,
    avatar_url: p.avatar_url,
    contact_email: p.contact_email,
    cv_url: p.cv_url,
    country_id: p.country_id,
    city_id: p.city_id,
    subject_ids: p.subject_ids,
    curriculum_ids: p.curriculum_ids,
    certification_ids: p.certification_ids,
    language_ids: p.language_ids,
    grade_band_ids: p.grade_band_ids,
    years_of_experience: p.years_of_experience,
    skillTermIds: (skillsRes.data ?? []).map((r) => r.skill_term_id),
    certificationTermIds: (certsRes.data ?? []).map((r) => r.certification_term_id),
    completedTrainingCount: Array.isArray(completedTraining) ? completedTraining.length : 0,
  };
}

export async function loadGapJobData(jobId: string): Promise<GapJobData | null> {
  const [jobRes, skillReqRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, subject_term_ids, curriculum_term_ids, certification_term_ids, language_term_ids, grade_band_term_ids, experience_min")
      .eq("id", jobId)
      .maybeSingle(),
    supabase
      .from("job_skill_requirements")
      .select("skill_term_id")
      .eq("job_id", jobId),
  ]);

  if (jobRes.error || !jobRes.data) {
    console.warn(`[GapDataLoader] Job not found: ${jobId}`);
    return null;
  }

  const j = jobRes.data;
  return {
    id: j.id,
    subject_term_ids: j.subject_term_ids,
    curriculum_term_ids: j.curriculum_term_ids,
    certification_term_ids: j.certification_term_ids,
    language_term_ids: j.language_term_ids,
    grade_band_term_ids: j.grade_band_term_ids,
    experience_min: j.experience_min,
    skillTermIds: (skillReqRes.data ?? []).map((r) => r.skill_term_id),
  };
}
