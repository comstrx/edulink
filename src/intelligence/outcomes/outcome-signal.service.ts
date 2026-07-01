/**
 * Outcome Signal Service — Sprint 15 PART 1
 *
 * Derives outcome signals by comparing before/after intelligence snapshots.
 * Pure reads from existing intelligence layer — no new tables, no ML.
 *
 * Called INSIDE Smart Glue context resolution to detect what happened
 * as a result of prior decisions.
 */

import { supabase } from "@/integrations/supabase/client";
import { supabaseRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type { OutcomeSignal, OutcomeImpact, TeacherOutcomeFeedback } from "./outcome.types";

// ── 1. Recommendation Outcome ─────────────────────────────────

/**
 * Check if a completed course was previously recommended.
 * Reads growth_recommendations for the teacher.
 */
export async function detectRecommendationOutcome(
  teacherId: string,
  courseId: string,
): Promise<OutcomeSignal | null> {
  try {
    const { data } = await supabase
      .from("growth_recommendations")
      .select("id, status, recommended_item_id")
      .eq("teacher_id", teacherId)
      .eq("recommended_item_id", courseId)
      .eq("recommended_item_type", "training_item")
      .in("status", ["active", "accepted"])
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    // Mark recommendation as completed (status update via intent)
    return {
      teacherId,
      sourceEvent: "training.completed",
      outcomeType: "recommendation_followed",
      impact: "positive",
      delta: 1,
      observedAt: new Date().toISOString(),
      reasoning: `recommendation ${data.id} fulfilled by completing course ${courseId}`,
    };
  } catch {
    return null;
  }
}

// ── 2. Gap Closure Outcome ────────────────────────────────────

/**
 * Check if a training completion closed gaps.
 * Uses the already-resolved closedGaps from training context.
 */
export function detectGapClosureOutcome(
  teacherId: string,
  closedGapCount: number,
  totalGapsBefore: number,
): OutcomeSignal | null {
  if (closedGapCount === 0) return null;

  const ratio = totalGapsBefore > 0 ? closedGapCount / totalGapsBefore : 0;
  const impact: OutcomeImpact = ratio >= 0.5 ? "positive" : "neutral";

  return {
    teacherId,
    sourceEvent: "training.completed",
    outcomeType: "gap_closure",
    impact,
    delta: -closedGapCount,
    observedAt: new Date().toISOString(),
    reasoning: `closed ${closedGapCount}/${totalGapsBefore} gaps (ratio=${(ratio * 100).toFixed(0)}%)`,
  };
}

// ── 3. Trust/Readiness Improvement (Mentorship) ───────────────

/**
 * Check if a mentorship evidence approval improved trust/readiness.
 * Compares current verified count against a threshold.
 */
export async function detectTrustImprovementOutcome(
  teacherId: string,
): Promise<OutcomeSignal | null> {
  try {
    const result = await supabaseRepository.getTeacherVerifiedStateSnapshot(teacherId);
    if (result.status === "not_found") return null;

    const { verifiedCount, totalCount } = result.data;
    const ratio = totalCount > 0 ? verifiedCount / totalCount : 0;

    // Consider trust improved if verification ratio > 50%
    if (ratio <= 0.5) return null;

    return {
      teacherId,
      sourceEvent: "mentorship.evidence.approved",
      outcomeType: "trust_improvement",
      impact: "positive",
      delta: verifiedCount,
      observedAt: new Date().toISOString(),
      reasoning: `trust ratio=${(ratio * 100).toFixed(0)}% (${verifiedCount}/${totalCount} verified)`,
    };
  } catch {
    return null;
  }
}

// ── 4. CRI Trending ───────────────────────────────────────────

/**
 * Detect CRI trend from talent profile signals.
 * Uses growth momentum as a proxy — no separate CRI history table.
 */
export async function detectCriTrend(
  teacherId: string,
): Promise<"up" | "stable" | "down"> {
  try {
    const { data } = await supabase
      .from("intelligence_talent_profiles")
      .select("growth_momentum, cri_score, unresolved_gap_count")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (!data) return "stable";

    // growth_momentum already tracks whether teacher is improving
    const momentum = data.growth_momentum as string;
    if (momentum === "accelerating" || momentum === "active") return "up";
    if (momentum === "inactive" || momentum === "stalled") return "down";
    return "stable";
  } catch {
    return "stable";
  }
}

// ── 5. Aggregate Feedback State ───────────────────────────────

/**
 * Build a composite feedback view for a teacher.
 * Entirely derived from existing intelligence — no new storage.
 */
export async function resolveTeacherFeedback(
  teacherId: string,
): Promise<TeacherOutcomeFeedback> {
  try {
    const [recCompletedData, recTotalData, talentData, gapData, completionData] = await Promise.all([
      // Count successful recommendations (completed)
      supabase
        .from("growth_recommendations")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("status", "completed"),
      // Count total recommendations (for success rate)
      supabase
        .from("growth_recommendations")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId),
      // Talent profile for CRI trend
      supabase
        .from("intelligence_talent_profiles")
        .select("growth_momentum, readiness_level, cri_score, unresolved_gap_count, training_completion_count")
        .eq("teacher_id", teacherId)
        .maybeSingle(),
      // Gap snapshot for closure rate
      supabaseRepository.getTeacherGapSnapshot(teacherId),
      // Recent completions with provider for provider outcome score
      supabase
        .from("training_completions")
        .select("id, verified_completion, source_id")
        .eq("teacher_id", teacherId)
        .order("completed_at", { ascending: false })
        .limit(50),
    ]);

    const successfulRecs = recCompletedData.count ?? 0;
    const totalRecs = recTotalData.count ?? 0;
    const talent = talentData.data;
    const momentum = (talent?.growth_momentum as string) ?? "inactive";
    const readiness = (talent?.readiness_level as string) ?? "early";
    const completions = talent?.training_completion_count ?? 0;
    const unresolvedGaps = talent?.unresolved_gap_count ?? 0;

    const criTrending: TeacherOutcomeFeedback["criTrending"] =
      momentum === "accelerating" || momentum === "active" ? "up" :
      momentum === "inactive" || momentum === "stalled" ? "down" : "stable";

    const readinessImproving = readiness !== "early" && readiness !== "not_started";

    // recommendationSuccessRate: completed / total (0–1)
    const recommendationSuccessRate = totalRecs > 0
      ? Math.round((successfulRecs / totalRecs) * 100) / 100
      : 0;

    // gapClosureRate: proxy from unresolved gaps vs completions
    const gapClosureRate = completions > 0
      ? Math.min(1, Math.max(0, 1 - (unresolvedGaps / Math.max(1, completions))))
      : 0;

    // gapClosureEffectiveness: 0–100 score combining closure rate + verified completions
    const totalGaps = gapData.status !== "not_found" ? gapData.data.totalGaps : 0;
    const verifiedCount = (completionData.data ?? []).filter((c: any) => c.verified_completion).length;
    const totalCompletionCount = (completionData.data ?? []).length;
    const verifiedRatio = totalCompletionCount > 0 ? verifiedCount / totalCompletionCount : 0;
    const gapClosureEffectiveness = Math.round(
      (gapClosureRate * 60 + verifiedRatio * 40) * 100
    ) / 100;

    // providerOutcomeScore: weighted by verified completions across providers (0–100)
    // Higher verified ratio = better provider outcomes
    const providerOutcomeScore = Math.round(verifiedRatio * 100);

    // improvementAfterRejectionScore: derived from CRI trend + gap closure + readiness
    // 0 = no improvement, 100 = strong improvement trajectory
    const trendBonus = criTrending === "up" ? 40 : criTrending === "stable" ? 20 : 0;
    const closureBonus = Math.round(gapClosureRate * 30);
    const readinessBonus = readinessImproving ? 30 : 0;
    const improvementAfterRejectionScore = Math.min(100, trendBonus + closureBonus + readinessBonus);

    // Learner band
    const learnerBand: TeacherOutcomeFeedback["learnerBand"] =
      criTrending === "up" && gapClosureRate >= 0.4 ? "effective" :
      criTrending === "down" && gapClosureRate < 0.2 ? "struggling" : "steady";

    return {
      teacherId,
      successfulRecommendations: successfulRecs,
      recommendationSuccessRate: Math.round(recommendationSuccessRate * 100) / 100,
      gapClosureRate: Math.round(gapClosureRate * 100) / 100,
      gapClosureEffectiveness,
      criTrending,
      readinessImproving,
      providerOutcomeScore,
      improvementAfterRejectionScore,
      learnerBand,
    };
  } catch {
    return {
      teacherId,
      successfulRecommendations: 0,
      recommendationSuccessRate: 0,
      gapClosureRate: 0,
      gapClosureEffectiveness: 0,
      criTrending: "stable",
      readinessImproving: false,
      providerOutcomeScore: 0,
      improvementAfterRejectionScore: 0,
      learnerBand: "steady",
    };
  }
}
