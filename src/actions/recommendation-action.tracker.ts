/**
 * Recommendation Action Tracker — Sprint 4, Step 6
 *
 * Minimal tracking for recommendation action clicks and execution.
 * Used inside the action handler only — never in UI components.
 * Does NOT affect decision engine or recommendation logic.
 *
 * Current implementation: structured console logging.
 * Ready to be swapped for a DB insert or analytics service later.
 */

export interface RecommendationActionEvent {
  recommendationId: string;
  actionType: string;
  targetResourceId: string;
  path: string;
  priority: string;
  outcome: "executed" | "unsupported";
  timestamp: string;
}

const EVENT_LOG: RecommendationActionEvent[] = [];

/**
 * Track a recommendation action execution.
 * Called by the action handler after resolving the action.
 */
export function trackRecommendationAction(event: RecommendationActionEvent): void {
  EVENT_LOG.push(event);

  if (import.meta.env.DEV) {
    console.info(
      `[RecommendationAction] ${event.outcome === "executed" ? "✅" : "⚠️"} ${event.actionType}`,
      {
        recommendationId: event.recommendationId,
        target: event.targetResourceId || "(none)",
        path: event.path,
        priority: event.priority,
      },
    );
  }
}

/**
 * Get tracked events (for testing / future analytics export).
 */
export function getTrackedActions(): readonly RecommendationActionEvent[] {
  return EVENT_LOG;
}

/**
 * Clear tracked events (for testing only).
 */
export function clearTrackedActions(): void {
  EVENT_LOG.length = 0;
}
