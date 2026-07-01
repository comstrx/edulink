/**
 * ContextBar Distribution — Surface-specific slice
 *
 * Provides only completion feedback and readiness context.
 * NO actionable recommendations — ContextBar is a signal strip,
 * not a recommendation surface.
 *
 * Pure function — no hooks, no side effects.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

export interface ContextBarDistribution {
  /** Most recent completed recommendation for feedback display */
  recentCompletion: UIRecommendation | undefined;
  /** Total completed count (for "X actions completed" text) */
  completedCount: number;
}

export function distributeContextBar(
  exposedItems: UIRecommendation[],
): ContextBarDistribution {
  const completed = exposedItems.filter((r) => r.isCompleted);

  return {
    recentCompletion: completed[0],
    completedCount: completed.length,
  };
}
