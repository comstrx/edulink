/**
 * Teacher Recommendation Adapter — Sprint 6
 *
 * Transforms orchestrator output into a Teacher-specific view model.
 * Pure transformation — no logic duplication, no policy decisions.
 *
 * Consumed by useTeacherRecommendations hook.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";
import type { OrchestratorOutput } from "../orchestrator/recommendation-orchestrator";

// ── View Model ────────────────────────────────────────────────

export interface TeacherRecommendationViewModel {
  /** The single top-priority non-completed recommendation (DailyActionCard) */
  primaryAction: UIRecommendation | undefined;
  /** Surface-capped list for dashboard widgets */
  dailyActions: UIRecommendation[];
  /** Exposed items excluding the primary action (GrowthActionsCard) */
  growthActions: UIRecommendation[];
  /** Full list for Recommendations page */
  allRecommendations: UIRecommendation[];
}

// ── Builder ───────────────────────────────────────────────────

/**
 * Builds the Teacher view model from orchestrator output.
 * No policy logic — only slicing and filtering.
 */
export function buildTeacherViewModel(
  output: OrchestratorOutput,
): TeacherRecommendationViewModel {
  const primaryAction = output.exposed.find((r) => r.status !== "completed");

  const growthActions = primaryAction
    ? output.exposed.filter((r) => r.status !== "completed" && r.id !== primaryAction.id)
    : output.exposed.filter((r) => r.status !== "completed");

  return {
    primaryAction,
    dailyActions: output.exposed,
    growthActions,
    allRecommendations: output.full,
  };
}
