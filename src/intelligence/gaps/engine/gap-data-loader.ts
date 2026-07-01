/**
 * Gap Engine v1 — Data Loader
 *
 * Loads raw data from source domains for gap input assembly.
 * READ-ONLY — no mutations. Parallel Supabase reads.
 *
 * Phase 6B
 */

import { supabase } from "@/integrations/supabase/client";

// ── Raw Data Types ─────────────────────────────────────────────

export interface GapRawTeacherProfile {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  cv_url: string | null;
  country_id: string | null;
  city_id: string | null;
  region_id: string | null;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  certification_ids: string[] | null;
  language_ids: string[] | null;
  grade_band_ids: string[] | null;
  years_of_experience: number | null;
  education: unknown;
  experience: unknown;
  completed_training: unknown;
}

export interface GapRawVerifiedState {
  verified_count: number;
  total_count: number;
  credentials: unknown;
  overall_status: string;
}

export interface GapRawMatchSnapshot {
  job_id: string;
  score: number;
  unmatched_term_ids: string[];
  dimensions: unknown;
}

export interface GapRawApplicationHistory {
  totalApplications: number;
  totalRejections: number;
  totalShortlists: number;
  totalInterviews: number;
}

export interface GapRawData {
  teacherProfile: GapRawTeacherProfile | null;
  certificationTermIds: string[];
  licenseTermIds: string[];
  degreeTermIds: string[];
  skillTermIds: string[];
  verifiedState: GapRawVerifiedState | null;
  applicationHistory: GapRawApplicationHistory;
  recentMatchSnapshots: GapRawMatchSnapshot[];
}

// ── Loader ─────────────────────────────────────────────────────

export async function loadGapRawData(teacherId: string): Promise<GapRawData> {
  const [
    profileRes,
    certsRes,
    licensesRes,
    degreesRes,
    skillsRes,
    verifiedRes,
    appsRes,
    matchSnapshotsRes,
  ] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("id, full_name, bio, avatar_url, contact_email, cv_url, country_id, city_id, region_id, subject_ids, curriculum_ids, certification_ids, language_ids, grade_band_ids, years_of_experience, education, experience, completed_training")
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
      .select("verified_count, total_count, credentials, overall_status")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("status")
      .eq("teacher_id", teacherId),
    supabase
      .from("intelligence_match_snapshots")
      .select("job_id, score, unmatched_term_ids, dimensions")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(5),
  ]);

  // Aggregate application history
  const apps = appsRes.data ?? [];
  const applicationHistory: GapRawApplicationHistory = {
    totalApplications: apps.length,
    totalRejections: apps.filter(a => a.status === "rejected").length,
    totalShortlists: apps.filter(a => a.status === "shortlisted").length,
    totalInterviews: apps.filter(a => a.status === "interview").length,
  };

  return {
    teacherProfile: profileRes.data as GapRawTeacherProfile | null,
    certificationTermIds: (certsRes.data ?? []).map(r => r.certification_term_id),
    licenseTermIds: (licensesRes.data ?? []).map(r => r.license_term_id),
    degreeTermIds: (degreesRes.data ?? []).map(r => r.degree_term_id),
    skillTermIds: (skillsRes.data ?? []).map(r => r.skill_term_id),
    verifiedState: verifiedRes.data as GapRawVerifiedState | null,
    applicationHistory,
    recentMatchSnapshots: (matchSnapshotsRes.data ?? []) as GapRawMatchSnapshot[],
  };
}
