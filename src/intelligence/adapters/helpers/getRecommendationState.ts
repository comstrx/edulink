/**
 * Derived UX State Helper
 *
 * Maps UIRecommendation.status to a journey-aware UX state label.
 * Pure derivation — no new backend states, no architecture changes.
 */

import type { UIRecommendation } from "../unified-recommendations.adapter";

export type RecommendationUXState = "next_step" | "in_progress" | "completed";

export function getRecommendationState(rec: UIRecommendation): RecommendationUXState {
  if (rec.status === "in_progress") return "in_progress";
  if (rec.status === "completed") return "completed";
  return "next_step";
}

export interface JourneyGroup {
  state: RecommendationUXState;
  label: string;
  items: UIRecommendation[];
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Groups recommendations into journey phases (next_step → in_progress → completed),
 * sorting each group internally by priority.
 * Returns only non-empty groups.
 */
export function groupByJourneyState(recs: UIRecommendation[]): JourneyGroup[] {
  const buckets: Record<RecommendationUXState, UIRecommendation[]> = {
    next_step: [],
    in_progress: [],
    completed: [],
  };

  for (const rec of recs) {
    buckets[getRecommendationState(rec)].push(rec);
  }

  // Sort each bucket by priority
  for (const key of Object.keys(buckets) as RecommendationUXState[]) {
    buckets[key].sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2),
    );
  }

  const labels: Record<RecommendationUXState, string> = {
    next_step: "Next Steps",
    in_progress: "In Progress",
    completed: "Completed",
  };

  const order: RecommendationUXState[] = ["next_step", "in_progress", "completed"];

  return order
    .filter((s) => buckets[s].length > 0)
    .map((s) => ({ state: s, label: labels[s], items: buckets[s] }));
}
