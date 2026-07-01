/**
 * Recommendation Action Handler — Sprint 4, Steps 1–6
 *
 * Central execution point for all recommendation-driven actions.
 * Pure routing — no computation, no derivation, no decision logic.
 *
 * Reads from recommendation-action.map.ts (single source of truth).
 * Tracks every execution via recommendation-action.tracker.ts.
 * UI components call this handler instead of navigating directly.
 */

import {
  resolveActionMapEntry,
  buildActionPath,
  type RecommendationActionType,
  type ActionMapEntry,
} from "./recommendation-action.map";
import { trackRecommendationAction } from "./recommendation-action.tracker";
import { recordFeedbackSignal } from "@/intelligence/feedback";

export type { RecommendationActionType } from "./recommendation-action.map";

export interface RecommendationActionInput {
  recommendationId: string;
  type: string;
  targetResourceId: string;
  actionLabelKey: string;
  priority: string;
  traceId?: string;
  pathwayContext?: { isPathway?: boolean; pathwayId?: string };
}

export interface ResolvedAction {
  actionType: RecommendationActionType;
  path: string;
  ctaLabel: string;
}

export function resolveRecommendationAction(input: RecommendationActionInput): ResolvedAction {
  const entry: ActionMapEntry = resolveActionMapEntry(input.type);
  const path = buildActionPath(entry, input.targetResourceId, input.pathwayContext);
  return { actionType: entry.actionType, path, ctaLabel: entry.ctaLabel };
}

/**
 * Execute a recommendation action via a navigate function.
 * This is the single entry point — UI must not navigate directly.
 * teacherId is optional — when provided, feedback signals are persisted to DB.
 */
export function executeRecommendationAction(
  input: RecommendationActionInput,
  navigate: (path: string) => void,
  teacherId?: string,
): ResolvedAction {
  const resolved = resolveRecommendationAction(input);
  const isExecuted = resolved.actionType !== "unsupported_action";

  // Track locally (existing tracker)
  trackRecommendationAction({
    recommendationId: input.recommendationId,
    actionType: resolved.actionType,
    targetResourceId: input.targetResourceId,
    path: resolved.path,
    priority: input.priority,
    outcome: isExecuted ? "executed" : "unsupported",
    timestamp: new Date().toISOString(),
  });

  // Persist feedback signals to DB (fire-and-forget)
  if (teacherId) {
    // Always record click
    recordFeedbackSignal({
      teacherId,
      recommendationId: input.recommendationId,
      signalType: "recommendation_clicked",
      actionType: resolved.actionType,
      targetResourceId: input.targetResourceId,
      priority: input.priority,
      traceId: input.traceId,
    });

    // Record execution if action was supported
    if (isExecuted) {
      recordFeedbackSignal({
        teacherId,
        recommendationId: input.recommendationId,
        signalType: "recommendation_executed",
        actionType: resolved.actionType,
        targetResourceId: input.targetResourceId,
        priority: input.priority,
        traceId: input.traceId,
        metadata: { path: resolved.path },
      });
    }
  }

  navigate(resolved.path);
  return resolved;
}
