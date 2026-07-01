/**
 * Match Data Loader — Reads raw domain data for match input assembly.
 *
 * Reads from:
 *   - teacher_profiles (identity domain)
 *   - teacher_skills, teacher_certifications, teacher_licenses, teacher_degrees (qualifications)
 *   - intelligence_verified_state_snapshots (trust domain read-model)
 *   - teacher_profiles.completed_training (training domain)
 *   - jobs + job_skill_requirements + job_language_requirements (hiring domain)
 *
 * All reads are additive — no mutations, no ownership changes.
 *
 * Phase 5B
 */

import { supabase } from "@/integrations/supabase/client";

// ── Raw teacher data ───────────────────────────────────────────

export interface MatchRawTeacherProfile {
  id: string;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  grade_band_ids: string[] | null;
  language_ids: string[] | null;
  years_of_experience: number | null;
  country_id: string | null;
  region_id: string | null;
  city_id: string | null;
  employment_type_term_ids: string[] | null;
  work_arrangement_term_ids: string[] | null;
  visa_status_term_id: string | null;
  certification_ids: string[] | null;
  completed_training: unknown;
}

export interface MatchRawTeacherQualifications {
  certificationTermIds: string[];
  licenseTermIds: string[];
  degreeTermIds: string[];
  skillTermIds: string[];
}

export interface MatchRawVerifiedState {
  verified_count: number;
  total_count: number;
  credentials: unknown;
}

// ── Raw job data ───────────────────────────────────────────────

export interface MatchRawJob {
  id: string;
  subject_term_ids: string[] | null;
  curriculum_term_ids: string[] | null;
  grade_band_term_ids: string[] | null;
  language_term_ids: string[] | null;
  certification_term_ids: string[] | null;
  experience_min: number | null;
  country_term_id: string | null;
  region_term_id: string | null;
  city_term_id: string | null;
  employment_type_term_ids: string[] | null;
  work_arrangement_term_ids: string[] | null;
  visa_status_term_ids: string[] | null;
}

export interface MatchRawJobSkillReq {
  skill_term_id: string;
  required_or_preferred: string;
}

export interface MatchRawJobLangReq {
  language_term_id: string;
  required_or_preferred: string;
}

// ── Combined raw data ──────────────────────────────────────────

export interface MatchRawData {
  teacherProfile: MatchRawTeacherProfile | null;
  teacherQualifications: MatchRawTeacherQualifications;
  verifiedState: MatchRawVerifiedState | null;
  job: MatchRawJob | null;
  jobSkillReqs: MatchRawJobSkillReq[];
  jobLangReqs: MatchRawJobLangReq[];
}

// ── Loader ─────────────────────────────────────────────────────

export async function loadMatchRawData(
  teacherId: string,
  jobId: string,
): Promise<MatchRawData> {
  const [
    profileRes,
    certsRes,
    licensesRes,
    degreesRes,
    skillsRes,
    verifiedRes,
    jobRes,
    jobSkillReqsRes,
    jobLangReqsRes,
  ] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select(
        "id, subject_ids, curriculum_ids, grade_band_ids, language_ids, years_of_experience, country_id, region_id, city_id, employment_type_term_ids, work_arrangement_term_ids, visa_status_term_id, certification_ids, completed_training",
      )
      .eq("id", teacherId)
      .maybeSingle(),

    supabase
      .from("teacher_certifications")
      .select("certification_term_id")
      .eq("teacher_id", teacherId),

    supabase
      .from("teacher_licenses")
      .select("license_term_id")
      .eq("teacher_id", teacherId),

    supabase
      .from("teacher_degrees")
      .select("degree_term_id")
      .eq("teacher_id", teacherId),

    supabase
      .from("teacher_skills")
      .select("skill_term_id")
      .eq("teacher_id", teacherId),

    supabase
      .from("intelligence_verified_state_snapshots")
      .select("verified_count, total_count, credentials")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("jobs")
      .select(
        "id, subject_term_ids, curriculum_term_ids, grade_band_term_ids, language_term_ids, certification_term_ids, experience_min, country_term_id, region_term_id, city_term_id, employment_type_term_ids, work_arrangement_term_ids, visa_status_term_ids",
      )
      .eq("id", jobId)
      .maybeSingle(),

    supabase
      .from("job_skill_requirements")
      .select("skill_term_id, required_or_preferred")
      .eq("job_id", jobId),

    supabase
      .from("job_language_requirements")
      .select("language_term_id, required_or_preferred")
      .eq("job_id", jobId),
  ]);

  return {
    teacherProfile: (profileRes.data as MatchRawTeacherProfile | null) ?? null,
    teacherQualifications: {
      certificationTermIds: (certsRes.data ?? []).map((r) => r.certification_term_id),
      licenseTermIds: (licensesRes.data ?? []).map((r) => r.license_term_id),
      degreeTermIds: (degreesRes.data ?? []).map((r) => r.degree_term_id),
      skillTermIds: (skillsRes.data ?? []).map((r) => r.skill_term_id),
    },
    verifiedState: (verifiedRes.data as MatchRawVerifiedState | null) ?? null,
    job: (jobRes.data as MatchRawJob | null) ?? null,
    jobSkillReqs: (jobSkillReqsRes.data ?? []) as MatchRawJobSkillReq[],
    jobLangReqs: (jobLangReqsRes.data ?? []) as MatchRawJobLangReq[],
  };
}
