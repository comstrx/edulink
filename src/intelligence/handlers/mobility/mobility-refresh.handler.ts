/**
 * Mobility Refresh Intent Handler — Sprint 8C
 */

import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { IntentEmission } from "@/smart-glue/types";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { refreshMobilityState } from "@/mobility/engine/mobility-refresh.service";
import { analyzeMobilityFeedback, executeMobilityFeedback } from "@/mobility/engine/mobility-feedback.service";

interface MobilityRefreshPayload {
  teacherId: string;
  triggeredBy: string;
}

export const mobilityRefreshHandler: IntentHandler<MobilityRefreshPayload> = {
  intentName: EVENT_NAMES.intents.mobilityRefreshRequested,
  description: "Evaluates teacher mobility readiness for all targets and persists states",

  async handle(
    intent: IntentEmission & { payload: MobilityRefreshPayload },
    context: HandlerContext
  ): Promise<HandlerResult> {
    const start = Date.now();
    const { teacherId } = intent.payload;

    try {
      const result = await refreshMobilityState(teacherId);

      // Execute feedback loop if evaluation succeeded with results
      if (result.success && result.evaluationResults && result.evaluationResults.length > 0) {
        const feedbackActions = analyzeMobilityFeedback(teacherId, result.evaluationResults);
        if (feedbackActions.length > 0) {
          await executeMobilityFeedback(teacherId, feedbackActions, context?.traceId);
        }
      }

      return {
        intent: EVENT_NAMES.intents.mobilityRefreshRequested,
        handlerExecuted: "mobility-refresh-handler",
        outputsWritten: result.success ? ["teacher_mobility_states", "growth_recommendations"] : [],
        executionTimeMs: Date.now() - start,
        success: result.success,
        error: result.error,
      };
    } catch (err: any) {
      return {
        intent: EVENT_NAMES.intents.mobilityRefreshRequested,
        handlerExecuted: "mobility-refresh-handler",
        outputsWritten: [],
        executionTimeMs: Date.now() - start,
        success: false,
        error: err.message,
      };
    }
  },
};
