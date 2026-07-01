/**
 * Training Completion Context Reader — Sprint 11
 *
 * Reads intelligence state to determine whether a training completion
 * closes an existing gap or is redundant learning.
 *
 * Pure read-only. No mutations.
 */

import { supabaseRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type { GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";

// ── Context Shape ─────────────────────────────────────────────

export interface TrainingCompletionDecisionContext {
  /** Whether gap data was available */
  hasGapData: boolean;
  /** Total unresolved gaps */
  totalGaps: number;
  /** Gaps that overlap with the completed course's skillIds */
  closedGaps: GapEntry[];
  /** Whether this completion closes at least one gap */
  closesGap: boolean;
  /** Whether the teacher already has recommendations */
  hasExistingRecommendations: boolean;
  /** Existing recommendation count */
  recommendationCount: number;
}

const EMPTY: TrainingCompletionDecisionContext = {
  hasGapData: false,
  totalGaps: 0,
  closedGaps: [],
  closesGap: false,
  hasExistingRecommendations: false,
  recommendationCount: 0,
};

// ── Reader ─────────────────────────────────────────────────────

/**
 * Read intelligence context for a training completion event.
 * Determines whether the completed course addresses existing skill gaps.
 *
 * Fire-and-forget safe: errors return empty context.
 */
export async function readTrainingCompletionContext(
  teacherId: string,
  skillIds: string[],
): Promise<TrainingCompletionDecisionContext> {
  try {
    const [gapResult, recResult] = await Promise.all([
      supabaseRepository.getTeacherGapSnapshot(teacherId),
      supabaseRepository.getTeacherRecommendationsSnapshot(teacherId),
    ]);

    // Gap analysis
    let hasGapData = false;
    let totalGaps = 0;
    let closedGaps: GapEntry[] = [];

    if (gapResult.status !== "not_found") {
      hasGapData = true;
      totalGaps = gapResult.data.totalGaps;
      // Find gaps whose termId matches any of the completed course's skillIds
      const skillSet = new Set(skillIds);
      closedGaps = gapResult.data.gaps.filter((g) => skillSet.has(g.termId));
    }

    // Recommendation state
    let hasExistingRecommendations = false;
    let recommendationCount = 0;

    if (recResult.status !== "not_found") {
      hasExistingRecommendations = recResult.data.totalCount > 0;
      recommendationCount = recResult.data.totalCount;
    }

    return {
      hasGapData,
      totalGaps,
      closedGaps,
      closesGap: closedGaps.length > 0,
      hasExistingRecommendations,
      recommendationCount,
    };
  } catch {
    return EMPTY;
  }
}
