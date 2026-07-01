/**
 * Recommendation Ordering — Sprint 4.2 Step 4
 *
 * Context-aware, deterministic ordering for recommendation entries.
 * Sorts by engine-provided priority, then rank as tie-breaker.
 *
 * Rules:
 *   - No new recommendations added/removed
 *   - No type changes
 *   - Purely positional reordering
 *   - Same input → same output (deterministic, stable sort)
 *   - Lives in intelligence layer, NOT in UI
 */

import type { RecommendationEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";

// ── Priority Weight Map (numeric, no labels in logic) ─────────

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ── Type Weight Map (stable tie-breaker when priority + rank equal) ──

const TYPE_WEIGHT: Record<string, number> = {
  training: 4,
  pathway: 3,
  job: 2,
  mentor: 1,
};

/**
 * Order recommendations by priority (desc) → rank (asc) → type (desc).
 *
 * Returns a NEW array — does not mutate input.
 * Deterministic: same input always produces same output.
 */
export function orderRecommendationsByPriority(
  recommendations: RecommendationEntry[],
): RecommendationEntry[] {
  if (recommendations.length <= 1) return [...recommendations];

  return [...recommendations].sort((a, b) => {
    // 1. Priority weight (higher = first)
    const pA = PRIORITY_WEIGHT[a.priority] ?? 0;
    const pB = PRIORITY_WEIGHT[b.priority] ?? 0;
    if (pA !== pB) return pB - pA;

    // 2. Rank (lower = first, preserves engine order within same priority)
    if (a.rank !== b.rank) return a.rank - b.rank;

    // 3. Type weight (training > pathway > job > mentor)
    const tA = TYPE_WEIGHT[a.type] ?? 0;
    const tB = TYPE_WEIGHT[b.type] ?? 0;
    return tB - tA;
  });
}
