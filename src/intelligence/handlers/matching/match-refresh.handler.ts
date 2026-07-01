/**
 * Match Refresh Handler
 *
 * Thin handler that delegates to the Match Refresh Service.
 * Processes intent.match_refresh_requested.
 *
 * Phase 5D — Delegates to v1 Match Engine pipeline
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { MatchRefreshRequestedPayload } from "@/contracts/smart-glue/intent.contracts";
import type { IntentEmission } from "@/smart-glue/types";
import { refreshMatch } from "@/intelligence/matching/services/match-refresh.service";

export const matchRefreshHandler: IntentHandler<MatchRefreshRequestedPayload> = {
  intentName: EVENT_NAMES.intents.matchRefreshRequested,
  description: "Recompute match scores for teacher×job pair via Match Engine v1",

  async handle(
    intent: IntentEmission & { payload: MatchRefreshRequestedPayload },
    context: HandlerContext,
  ): Promise<HandlerResult> {
    const { teacherId, jobId, triggeredBy } = intent.payload;

    console.debug("[MatchRefreshHandler] Intent received", {
      teacherId: teacherId ?? "all",
      jobId: jobId ?? "all",
      triggeredBy,
      executedAt: context.executedAt,
    });

    // Both teacherId and jobId are required for v1 match computation
    if (!teacherId || !jobId) {
      console.warn("[MatchRefreshHandler] Missing teacherId or jobId, skipping");
      return {
        intent: intent.intent,
        handlerExecuted: "match-refresh-handler",
        outputsWritten: [],
        executionTimeMs: 0,
        success: false,
        error: "Both teacherId and jobId are required for match computation",
      };
    }

    const startTime = Date.now();

    // Delegate to service
    const outcome = await refreshMatch({
      teacherId,
      jobId,
      triggeredByEvent: triggeredBy,
      triggeredAt: context.executedAt,
    });

    const executionTimeMs = Date.now() - startTime;

    console.debug("[MatchRefreshHandler] Completed", {
      success: outcome.success,
      matchScore: outcome.result?.matchScore,
      matchBand: outcome.result?.matchBand,
      snapshotWritten: outcome.snapshotWritten,
      executionTimeMs,
    });

    return {
      intent: intent.intent,
      handlerExecuted: "match-refresh-handler",
      outputsWritten: outcome.snapshotWritten ? ["intelligence_match_snapshots"] : [],
      executionTimeMs,
      success: outcome.success,
      error: outcome.error,
    };
  },
};
