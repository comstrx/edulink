/**
 * Reputation Refresh Intent Handler — Sprint 8B
 *
 * Processes intent.reputation_refresh_requested by calling
 * the reputation event handler to persist and recompute.
 */

import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { IntentEmission } from "@/smart-glue/types";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { processReputationEvent } from "@/reputation/engine/reputation-event-handler";

interface ReputationRefreshPayload {
  teacherId: string;
  triggeredBy: string;
  eventType: string;
}

export const reputationRefreshHandler: IntentHandler<ReputationRefreshPayload> = {
  intentName: EVENT_NAMES.intents.reputationRefreshRequested,
  description: "Processes reputation-generating events and refreshes the reputation profile",

  async handle(
    intent: IntentEmission & { payload: ReputationRefreshPayload },
    context: HandlerContext
  ): Promise<HandlerResult> {
    const start = Date.now();
    const { teacherId, triggeredBy, eventType } = intent.payload;

    try {
      const result = await processReputationEvent({
        teacherId,
        eventType,
        sourceDomain: triggeredBy,
        sourceReferenceId: undefined,
      });

      return {
        intent: EVENT_NAMES.intents.reputationRefreshRequested,
        handlerExecuted: "reputation-refresh-handler",
        outputsWritten: result.success
          ? ["reputation_events", "reputation_profiles"]
          : [],
        executionTimeMs: Date.now() - start,
        success: result.success,
        error: result.error,
      };
    } catch (err: any) {
      return {
        intent: EVENT_NAMES.intents.reputationRefreshRequested,
        handlerExecuted: "reputation-refresh-handler",
        outputsWritten: [],
        executionTimeMs: Date.now() - start,
        success: false,
        error: err.message,
      };
    }
  },
};
