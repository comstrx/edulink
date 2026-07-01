/**
 * Recommendation Context Reader — Pre-Sprint 10
 *
 * Reads existing recommendation snapshots for decision gating.
 * Used by training.completed and mentorship.evidenceApproved rules
 * to skip redundant recommendation generation.
 *
 * Pure read-only. No mutations.
 */

import { supabaseRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";

export interface RecommendationGateContext {
  hasExistingRecommendations: boolean;
  recommendationCount: number;
}

const EMPTY: RecommendationGateContext = {
  hasExistingRecommendations: false,
  recommendationCount: 0,
};

/**
 * Read recommendation state for gating decisions.
 * Fire-and-forget safe: errors return empty context.
 */
export async function readRecommendationContext(
  teacherId: string,
): Promise<RecommendationGateContext> {
  try {
    const result = await supabaseRepository.getTeacherRecommendationsSnapshot(teacherId);
    if (result.status === "not_found") return EMPTY;

    return {
      hasExistingRecommendations: result.data.totalCount > 0,
      recommendationCount: result.data.totalCount,
    };
  } catch {
    return EMPTY;
  }
}
