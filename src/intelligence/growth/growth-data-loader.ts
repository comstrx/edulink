/**
 * Growth Recommendation Data Loader — Sprint 7C
 *
 * Loads the teacher's current runtime state for the growth engine.
 * READ-ONLY — no mutations.
 */

import { supabase } from "@/integrations/supabase/client";
import type { GrowthEngineTeacherState } from "./types/growth-recommendation.types";

/** Profile-level state signals for baseline growth evaluation */
export interface ProfileStateSignals {
  profileComplete: boolean;
  skillsCount: number;
  credentialsCount: number;
  hasTrainingHistory: boolean;
}

export interface GrowthRawData {
  teacherState: GrowthEngineTeacherState;
  rejectionReasonTermIds: string[];
  rejectionReasonSlugs: string[];
  unmatchedTermIds: string[];
  gapTermIds: string[];
  catalogByTermId: Record<string, { itemId: string; itemType: string; title: string }[]>;
  /** Sprint 12: Profile state for baseline growth evaluation */
  profileState: ProfileStateSignals;
}

export async function loadGrowthRawData(teacherId: string): Promise<GrowthRawData> {
  const [
    enrollmentsRes,
    pathwayExecsRes,
    completionsRes,
    evidenceRejectedRes,
    evidencePendingRes,
    credentialsRes,
    rejectionsRes,
    gapRes,
    matchRes,
    catalogRes,
    profileRes,
    skillsRes,
  ] = await Promise.all([
    // Active enrollments
    supabase
      .from("training_enrollments")
      .select("item_id")
      .eq("teacher_id", teacherId)
      .in("status", ["enrolled", "active"]),

    // Active pathway executions
    supabase
      .from("pathway_executions")
      .select("pathway_id, progress_percent, status")
      .eq("teacher_id", teacherId)
      .neq("status", "completed"),

    // Completions (all)
    supabase
      .from("training_completions")
      .select("source_id, verified_completion")
      .eq("teacher_id", teacherId),

    // Evidence needing revision
    supabase
      .from("training_evidence")
      .select("id, execution_id")
      .eq("teacher_id", teacherId)
      .in("review_status", ["rejected", "needs_revision"]),

    // Evidence pending mentor review
    supabase
      .from("training_evidence")
      .select("id, execution_id")
      .eq("teacher_id", teacherId)
      .in("review_status", ["submitted", "under_review"]),

    // Earned credentials
    supabase
      .from("earned_credentials")
      .select("source_id")
      .eq("teacher_id", teacherId)
      .eq("status", "active"),

    // Rejection signals with metadata
    supabase
      .from("hiring_signals")
      .select("metadata")
      .eq("teacher_id", teacherId)
      .eq("signal_type", "application_rejected"),

    // Latest gap snapshot
    supabase
      .from("intelligence_gap_snapshots")
      .select("gaps, gap_term_ids:gaps")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Latest match snapshot (for unmatched terms)
    supabase
      .from("intelligence_match_snapshots")
      .select("unmatched_term_ids")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(3),

    // Training catalog for term mapping
    supabase
      .from("training_items")
      .select("id, title, type, subject_term_ids, skill_term_ids, curriculum_term_ids")
      .eq("status", "published")
      .eq("is_active", true)
      .limit(200),

    // Sprint 12: Profile completeness signals
    supabase
      .from("teacher_profiles")
      .select("bio, years_of_experience, subject_ids, curriculum_ids")
      .eq("id", teacherId)
      .maybeSingle(),

    // Sprint 12: Skills count
    supabase
      .from("teacher_skills")
      .select("id")
      .eq("teacher_id", teacherId),
  ]);

  // Build teacher state
  const completions = (completionsRes.data ?? []) as { source_id: string; verified_completion: boolean }[];
  const completedItemIds = completions.map((c) => c.source_id);
  const verifiedCompletionItemIds = completions
    .filter((c) => c.verified_completion)
    .map((c) => c.source_id);

  const pathwayExecs = (pathwayExecsRes.data ?? []) as {
    pathway_id: string;
    progress_percent: number;
    status: string;
  }[];

  const teacherState: GrowthEngineTeacherState = {
    activeEnrollmentItemIds: ((enrollmentsRes.data ?? []) as { item_id: string }[]).map((e) => e.item_id),
    activePathwayIds: pathwayExecs.map((p) => p.pathway_id),
    completedItemIds,
    verifiedCompletionItemIds,
    pendingEvidenceExecutionIds: ((evidenceRejectedRes.data ?? []) as { execution_id: string }[]).map(
      (e) => e.execution_id,
    ),
    rejectedEvidenceIds: ((evidenceRejectedRes.data ?? []) as { id: string }[]).map((e) => e.id),
    pendingMentorReviewIds: ((evidencePendingRes.data ?? []) as { id: string }[]).map((e) => e.id),
    earnedCredentialSourceIds: ((credentialsRes.data ?? []) as { source_id: string }[]).map(
      (e) => e.source_id,
    ),
    activePathwayProgress: pathwayExecs.map((p) => ({
      pathwayId: p.pathway_id,
      progressPercent: p.progress_percent ?? 0,
    })),
  };

  // Extract rejection reasons
  const rejectionReasonTermIds: string[] = [];
  const rejectionReasonSlugs: string[] = [];
  for (const signal of (rejectionsRes.data ?? []) as { metadata: Record<string, unknown> | null }[]) {
    const meta = signal.metadata;
    if (!meta) continue;
    const termId = meta.rejection_reason_term_id ?? meta.reasonTermId;
    const slug = meta.rejection_reason_slug ?? meta.reasonSlug;
    if (typeof termId === "string") rejectionReasonTermIds.push(termId);
    if (typeof slug === "string") rejectionReasonSlugs.push(slug);
  }

  // Unmatched terms from match snapshots
  const unmatchedTermIds = [
    ...new Set(
      (matchRes.data ?? []).flatMap(
        (s: { unmatched_term_ids: string[] }) => s.unmatched_term_ids ?? [],
      ),
    ),
  ];

  // Gap term IDs from gap snapshot
  const gapTermIds: string[] = [];
  if (gapRes.data) {
    const gaps = Array.isArray(gapRes.data.gaps) ? gapRes.data.gaps : [];
    for (const g of gaps as { taxonomy_term_id?: string; taxonomyTermId?: string }[]) {
      const tid = g.taxonomy_term_id ?? g.taxonomyTermId;
      if (typeof tid === "string") gapTermIds.push(tid);
    }
  }

  // Build catalog by term ID
  const catalogByTermId: Record<string, { itemId: string; itemType: string; title: string }[]> = {};
  for (const item of (catalogRes.data ?? []) as {
    id: string;
    title: string;
    type: string;
    subject_term_ids: string[] | null;
    skill_term_ids: string[] | null;
    curriculum_term_ids: string[] | null;
  }[]) {
    const allTerms = [
      ...(item.subject_term_ids ?? []),
      ...(item.skill_term_ids ?? []),
      ...(item.curriculum_term_ids ?? []),
    ];
    for (const tid of allTerms) {
      if (!catalogByTermId[tid]) catalogByTermId[tid] = [];
      catalogByTermId[tid].push({ itemId: item.id, itemType: item.type, title: item.title });
    }
  }

  // Sprint 12: Build profile state signals
  const profile = profileRes.data as {
    bio: string | null;
    years_of_experience: number | null;
    subject_ids: string[] | null;
    curriculum_ids: string[] | null;
  } | null;

  const profileComplete = !!(
    profile?.bio &&
    profile?.years_of_experience != null &&
    (profile?.subject_ids?.length ?? 0) > 0
  );

  const profileState: ProfileStateSignals = {
    profileComplete,
    skillsCount: (skillsRes.data ?? []).length,
    credentialsCount: ((credentialsRes.data ?? []) as { source_id: string }[]).length,
    hasTrainingHistory: completions.length > 0 || ((enrollmentsRes.data ?? []) as { item_id: string }[]).length > 0,
  };

  return {
    teacherState,
    rejectionReasonTermIds,
    rejectionReasonSlugs,
    unmatchedTermIds,
    gapTermIds,
    catalogByTermId,
    profileState,
  };
}
