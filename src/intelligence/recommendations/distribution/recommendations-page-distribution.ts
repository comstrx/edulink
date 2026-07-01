/**
 * Recommendations Page Distribution — Surface-specific slice
 *
 * Full list with pre-computed grouping.
 * Grouping happens HERE, not in the component.
 *
 * Pure function — no hooks, no side effects.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

export interface RecommendationsPageDistribution {
  /** All recommendations (full list, no caps) */
  items: UIRecommendation[];
  /** Pre-grouped by groupKey */
  grouped: Record<string, UIRecommendation[]>;
  /** Active (non-completed) count */
  activeCount: number;
  /** Completed count */
  completedCount: number;
  /** Available group keys in order of appearance */
  groupOrder: string[];
}

export function distributeRecommendationsPage(
  fullItems: UIRecommendation[],
): RecommendationsPageDistribution {
  const grouped: Record<string, UIRecommendation[]> = {};
  const groupOrder: string[] = [];

  for (const r of fullItems) {
    const key = r.groupKey ?? "other";
    if (!grouped[key]) {
      grouped[key] = [];
      groupOrder.push(key);
    }
    grouped[key].push(r);
  }

  const activeCount = fullItems.filter((r) => r.status !== "completed").length;
  const completedCount = fullItems.filter((r) => r.status === "completed").length;

  return {
    items: fullItems,
    grouped,
    activeCount,
    completedCount,
    groupOrder,
  };
}
