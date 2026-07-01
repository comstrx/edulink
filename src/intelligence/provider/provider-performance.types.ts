/**
 * Provider Performance Intelligence — Sprint 14
 *
 * Derived provider-level signals computed from existing
 * teacher intelligence outputs. NOT raw analytics.
 *
 * Single source of truth for provider effectiveness signals.
 */

export interface ProviderPerformanceSummary {
  providerId: string;
  /** Total completions across all courses from this provider */
  completionCount: number;
  /** How many of those completions closed at least one gap */
  gapClosureCount: number;
  /** Verified completions (mentor-validated) */
  verifiedCompletionCount: number;
  /** Effectiveness score 0–100 derived from gap closure ratio */
  effectivenessScore: number;
  /** Band classification */
  effectivenessBand: ProviderEffectivenessBand;
  /** Last time this summary was updated */
  lastUpdatedAt: string;
}

export type ProviderEffectivenessBand = "high" | "medium" | "low" | "unknown";

/**
 * Compute effectiveness score from raw counts.
 * Pure function — no side effects.
 */
export function computeProviderEffectiveness(
  completionCount: number,
  gapClosureCount: number,
  verifiedCompletionCount: number,
): { score: number; band: ProviderEffectivenessBand } {
  if (completionCount === 0) {
    return { score: 0, band: "unknown" };
  }

  // Weighted formula:
  //   gap closure ratio (60%) + verified ratio (40%)
  const gapRatio = gapClosureCount / completionCount;
  const verifiedRatio = verifiedCompletionCount / completionCount;
  const score = Math.round((gapRatio * 60 + verifiedRatio * 40) * 100) / 100;

  const band: ProviderEffectivenessBand =
    score >= 50 ? "high" :
    score >= 25 ? "medium" :
    completionCount < 3 ? "unknown" : "low";

  return { score, band };
}
