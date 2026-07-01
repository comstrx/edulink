/**
 * CRI Data Loader — Reads raw domain data for CRI input assembly.
 *
 * Reads from:
 *   - teacher_profiles (identity domain)
 *   - teacher_skills, teacher_certifications, teacher_degrees, teacher_languages (relational tables)
 *   - completed_training (JSON on teacher_profiles)
 *   - intelligence_verified_state_snapshots (trust domain read-model)
 *   - applications (hiring domain)
 *
 * All reads are additive — no mutations, no ownership changes.
 *
 * Phase 4B
 */

import { supabase } from "@/integrations/supabase/client";

// ── Raw data shapes ────────────────────────────────────────────

export interface CriRawProfile {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  cv_url: string | null;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  grade_band_ids: string[] | null;
  years_of_experience: number | null;
  country_id: string | null;
  region_id: string | null;
  city_id: string | null;
  completed_training: unknown;
  education: unknown;
  experience: unknown;
}

export interface CriRawCounts {
  skillCount: number;
  certificationCount: number;
  degreeCount: number;
  languageCount: number;
}

export interface CriRawVerifiedState {
  verified_count: number;
  total_count: number;
  overall_status: string;
  credentials: unknown;
}

export interface CriRawHiringAggregates {
  applicationsCount: number;
  shortlistedCount: number;
  rejectionsCount: number;
  interviewsCount: number;
}

/** v2: Runtime training growth signals */
export interface CriRawTrainingGrowth {
  completedCourseCount: number;
  completedPathwayCount: number;
  verifiedCompletionCount: number;
  recentCompletionCount: number;
  criBoostTotal: number;
  approvedEvidenceCount: number;
  mentorApprovedCount: number;
  activePathwayProgressPercent: number;
  earnedCredentialCount: number;
}

export interface CriRawData {
  profile: CriRawProfile | null;
  counts: CriRawCounts;
  verifiedState: CriRawVerifiedState | null;
  hiring: CriRawHiringAggregates;
  trainingGrowth: CriRawTrainingGrowth;
}

// ── Loader ─────────────────────────────────────────────────────

/**
 * Load all raw domain data needed for CRI computation.
 * All queries run in parallel for efficiency.
 */
export async function loadCriRawData(teacherId: string): Promise<CriRawData> {
  const [profileResult, skillsResult, certsResult, degreesResult, langsResult, verifiedResult, appsResult,
    completionsResult, verifiedCompletionsResult, pathwayCompletionsResult, activePathwayResult,
    evidenceResult, mentorResult, credentialResult, criBoostResult,
  ] =
    await Promise.all([
      supabase
        .from("teacher_profiles")
        .select(
          "id, full_name, bio, avatar_url, cv_url, subject_ids, curriculum_ids, grade_band_ids, years_of_experience, country_id, region_id, city_id, completed_training, education, experience",
        )
        .eq("id", teacherId)
        .single(),

      supabase
        .from("teacher_skills")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId),

      supabase
        .from("teacher_certifications")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId),

      supabase
        .from("teacher_degrees")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId),

      supabase
        .from("teacher_languages")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId),

      supabase
        .from("intelligence_verified_state_snapshots")
        .select("verified_count, total_count, overall_status, credentials")
        .eq("teacher_id", teacherId)
        .eq("staleness", "fresh")
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("applications")
        .select("status")
        .eq("teacher_id", teacherId),

      // v2: Runtime completions from training_completions table
      supabase
        .from("training_completions")
        .select("id, source_type, completed_at, verified_completion", { count: "exact" })
        .eq("teacher_id", teacherId),

      // v2: Verified completions specifically
      supabase
        .from("training_completions")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("verified_completion", true),

      // v2: Pathway completions
      supabase
        .from("pathway_executions")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("status", "completed"),

      // v2: Active pathway progress
      supabase
        .from("pathway_executions")
        .select("progress_percent")
        .eq("teacher_id", teacherId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // v2: Approved evidence count
      supabase
        .from("training_evidence")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("review_status", "approved"),

      // v2: Mentor-approved reviews
      supabase
        .from("mentor_reviews")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("review_decision", "approved"),

      // v2: Earned credentials
      supabase
        .from("earned_credentials")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("status", "active"),

      // v2: CRI boost from completed training items
      supabase
        .from("training_completions")
        .select("source_id")
        .eq("teacher_id", teacherId),
    ]);

  // Profile
  const profile: CriRawProfile | null = profileResult.data as CriRawProfile | null;

  // Relational counts
  const counts: CriRawCounts = {
    skillCount: skillsResult.count ?? 0,
    certificationCount: certsResult.count ?? 0,
    degreeCount: degreesResult.count ?? 0,
    languageCount: langsResult.count ?? 0,
  };

  // Trust
  const verifiedState: CriRawVerifiedState | null =
    (verifiedResult.data as CriRawVerifiedState | null) ?? null;

  // Hiring aggregates — derive from application rows
  const apps = (appsResult.data ?? []) as Array<{ status: string }>;
  const hiring: CriRawHiringAggregates = {
    applicationsCount: apps.length,
    shortlistedCount: apps.filter((a) => a.status === "shortlisted").length,
    rejectionsCount: apps.filter((a) => a.status === "rejected").length,
    interviewsCount: apps.filter((a) => a.status === "interview").length,
  };

  // v2: Runtime training growth signals
  const completions = (completionsResult.data ?? []) as Array<{ completed_at: string; source_type: string }>;
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const recentCount = completions.filter(c => {
    if (!c.completed_at) return false;
    return new Date(c.completed_at) >= twelveMonthsAgo;
  }).length;

  // Load cri_boost_value from training items that were completed
  let criBoostTotal = 0;
  const completedSourceIds = (criBoostResult.data ?? []).map((c: { source_id: string }) => c.source_id);
  if (completedSourceIds.length > 0) {
    const { data: boostItems } = await supabase
      .from("training_items")
      .select("cri_boost_value")
      .in("id", completedSourceIds.slice(0, 50));
    criBoostTotal = (boostItems ?? []).reduce((sum: number, item: { cri_boost_value: number | null }) =>
      sum + (item.cri_boost_value ?? 0), 0);
  }

  const trainingGrowth: CriRawTrainingGrowth = {
    completedCourseCount: completionsResult.count ?? completions.length,
    completedPathwayCount: pathwayCompletionsResult.count ?? 0,
    verifiedCompletionCount: verifiedCompletionsResult.count ?? 0,
    recentCompletionCount: recentCount,
    criBoostTotal,
    approvedEvidenceCount: evidenceResult.count ?? 0,
    mentorApprovedCount: mentorResult.count ?? 0,
    activePathwayProgressPercent: Number(activePathwayResult.data?.progress_percent ?? 0),
    earnedCredentialCount: credentialResult.count ?? 0,
  };

  return { profile, counts, verifiedState, hiring, trainingGrowth };
}
