/**
 * Verified State Refresh Intent Handler
 *
 * Processes intent.verified_state_refresh_requested by delegating
 * to the verified state refresh service.
 *
 * Sprint 4 — Fix 3
 */

import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { IntentEmission } from "@/smart-glue/types";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { refreshVerifiedState } from "@/intelligence/verified-state/verified-state-refresh.service";

interface VerifiedStateRefreshPayload {
  teacherId: string;
  triggeredBy: string;
}

export const verifiedStateRefreshHandler: IntentHandler<VerifiedStateRefreshPayload> = {
  intentName: EVENT_NAMES.intents.verifiedStateRefreshRequested,
  description: "Refreshes the verified state snapshot for a teacher",

  async handle(
    intent: IntentEmission & { payload: VerifiedStateRefreshPayload },
    context: HandlerContext,
  ): Promise<HandlerResult> {
    const start = Date.now();
    const { teacherId, triggeredBy } = intent.payload;

    try {
      const result = await refreshVerifiedState({ teacherId, triggeredBy });

      return {
        intent: EVENT_NAMES.intents.verifiedStateRefreshRequested,
        handlerExecuted: "verified-state-refresh-handler",
        outputsWritten: result.snapshotWritten
          ? ["intelligence_verified_state_snapshots"]
          : [],
        executionTimeMs: Date.now() - start,
        success: result.success,
        error: result.error,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        intent: EVENT_NAMES.intents.verifiedStateRefreshRequested,
        handlerExecuted: "verified-state-refresh-handler",
        outputsWritten: [],
        executionTimeMs: Date.now() - start,
        success: false,
        error: message,
      };
    }
  },
};
