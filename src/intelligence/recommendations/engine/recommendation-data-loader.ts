/**
 * Recommendation Data Loader
 *
 * Reads intelligence snapshots, teacher profile, verified state,
 * and training catalog to feed the Recommendation Engine input builder.
 * READ-ONLY — no mutations.
 *
 * Phase 7B
 */

import { supabase } from "@/integrations/supabase/client";

// ── Raw data shapes ────────────────────────────────────────────

export interface RawCriSnapshot {
  score: number;
  dimensions: unknown;
  engine_version: string;
  computed_at: string;
}

export interface RawGapSnapshot {
  gaps: unknown;
  total_gaps: number;
  computed_at: string;
}

export interface RawMatchSnapshot {
  job_id: string;
  score: number;
  confidence: string;
  dimensions: unknown;
  matched_term_ids: string[];
  unmatched_term_ids: string[];
  computed_at: string;
}

export interface RawVerifiedState {
  overall_status: string;
  credentials: unknown;
  verified_count: number;
  total_count: number;
}

export interface RawTeacherProfile {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  cv_url: string | null;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  grade_band_ids: string[] | null;
  language_ids: string[] | null;
  country_id: string | null;
  region_id: string | null;
  city_id: string | null;
  years_of_experience: number | null;
  education: unknown;
  experience: unknown;
  completed_training: unknown;
}

export interface RawTrainingItem {
  id: string;
  title: string;
  type: string;
  subject_term_ids: string[] | null;
  skill_term_ids: string[] | null;
  curriculum_term_ids: string[] | null;
  grade_band_term_ids: string[] | null;
  credential_eligible: boolean;
  provider_id: string | null;
}

export interface RecommendationRawData {
  teacherProfile: RawTeacherProfile | null;
  criSnapshot: RawCriSnapshot | null;
  gapSnapshot: RawGapSnapshot | null;
  matchSnapshots: RawMatchSnapshot[];
  verifiedState: RawVerifiedState | null;
  trainingCatalog: RawTrainingItem[];
  // v2: Runtime state fields
  activePathways: Record<string, unknown>[];
  executionsMissingEvidence: Record<string, unknown>[];
  evidenceNeedingRevision: Record<string, unknown>[];
  evidencePendingReview: Record<string, unknown>[];
  completionsWithoutVerification: Record<string, unknown>[];
  rejectionReasonTermIds: string[];
  completedItemIds: string[];
  pathwayCriTargets: Record<string, unknown>[];
}

// ── Loader ─────────────────────────────────────────────────────

export async function loadRecommendationRawData(
  teacherId: string,
): Promise<RecommendationRawData> {
  const [
    profileRes, criRes, gapRes, matchRes, verifiedRes, catalogRes,
    activePathwaysRes, completionsRes, evidenceRevisionRes, evidencePendingRes,
    unverifiedCompletionsRes, rejectionsRes,
  ] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("id, full_name, bio, avatar_url, contact_email, cv_url, subject_ids, curriculum_ids, grade_band_ids, language_ids, country_id, region_id, city_id, years_of_experience, education, experience, completed_training")
      .eq("id", teacherId)
      .maybeSingle(),
    supabase
      .from("intelligence_cri_snapshots")
      .select("score, dimensions, engine_version, computed_at")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("intelligence_gap_snapshots")
      .select("gaps, total_gaps, computed_at")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("intelligence_match_snapshots")
      .select("job_id, score, confidence, dimensions, matched_term_ids, unmatched_term_ids, computed_at")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(5),
    supabase
      .from("intelligence_verified_state_snapshots")
      .select("overall_status, credentials, verified_count, total_count")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("training_items")
      .select("id, title, type, subject_term_ids, skill_term_ids, curriculum_term_ids, grade_band_term_ids, credential_eligible, provider_id")
      .eq("status", "published")
      .eq("is_active", true)
      .limit(200),

    // v2: Active pathway executions
    supabase
      .from("pathway_executions")
      .select("id, pathway_id, progress_percent, status")
      .eq("teacher_id", teacherId)
      .eq("status", "active"),

    // v2: Completed training (for completedItemIds)
    supabase
      .from("training_completions")
      .select("source_id, verified_completion")
      .eq("teacher_id", teacherId),

    // v2: Evidence needing revision
    supabase
      .from("training_evidence")
      .select("id, execution_id, title, review_status")
      .eq("teacher_id", teacherId)
      .in("review_status", ["rejected", "needs_revision"]),

    // v2: Evidence pending mentor review
    supabase
      .from("training_evidence")
      .select("id, execution_id, title, review_status")
      .eq("teacher_id", teacherId)
      .in("review_status", ["submitted", "under_review"]),

    // v2: Completions without verification
    supabase
      .from("training_completions")
      .select("source_id")
      .eq("teacher_id", teacherId)
      .eq("verified_completion", false),

    // v2: Rejection reasons (from hiring_signals)
    supabase
      .from("hiring_signals")
      .select("metadata")
      .eq("teacher_id", teacherId)
      .eq("signal_type", "application_rejected"),
  ]);

  // Extract completed item IDs
  const completions = (completionsRes.data ?? []) as unknown as Array<{ source_id: string; verified_completion: boolean }>;
  const completedItemIds = completions.map(c => c.source_id);

  // Extract rejection reason term IDs from hiring signals metadata
  const rejectionReasonTermIds: string[] = [];
  for (const signal of (rejectionsRes.data ?? []) as Array<{ metadata: Record<string, unknown> | null }>) {
    const reasonTermId = signal.metadata?.rejection_reason_term_id ?? signal.metadata?.reasonTermId;
    if (typeof reasonTermId === "string") rejectionReasonTermIds.push(reasonTermId);
  }

  // Unverified completions
  const unverifiedCompletions = (unverifiedCompletionsRes.data ?? []) as unknown as Array<{ source_id: string }>;

  return {
    teacherProfile: profileRes.data as RawTeacherProfile | null,
    criSnapshot: criRes.data as RawCriSnapshot | null,
    gapSnapshot: gapRes.data as RawGapSnapshot | null,
    matchSnapshots: (matchRes.data ?? []) as RawMatchSnapshot[],
    verifiedState: verifiedRes.data as RawVerifiedState | null,
    trainingCatalog: (catalogRes.data ?? []) as RawTrainingItem[],
    activePathways: (activePathwaysRes.data ?? []) as Record<string, unknown>[],
    executionsMissingEvidence: [], // Computed downstream if needed
    evidenceNeedingRevision: (evidenceRevisionRes.data ?? []) as Record<string, unknown>[],
    evidencePendingReview: (evidencePendingRes.data ?? []) as Record<string, unknown>[],
    completionsWithoutVerification: unverifiedCompletions.map(c => ({ execution_id: c.source_id, item_title: "" })),
    rejectionReasonTermIds,
    completedItemIds,
    pathwayCriTargets: [], // Would need to join training_items for cri_target
  };
}
