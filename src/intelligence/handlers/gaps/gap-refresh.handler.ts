/**
 * Gap Refresh Handler
 *
 * Thin handler for intent.skill_gap_refresh_requested.
 * Delegates all work to GapRefreshService.
 *
 * Phase 6D — Live implementation (v2 handler using Gap Engine v1)
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { SkillGapRefreshRequestedPayload } from "@/contracts/smart-glue/intent.contracts";
import type { IntentEmission } from "@/smart-glue/types";
import { refreshGaps } from "@/intelligence/gaps/services/gap-refresh.service";

export const gapRefreshHandler: IntentHandler<SkillGapRefreshRequestedPayload> = {
  intentName: EVENT_NAMES.intents.skillGapRefreshRequested,
  description: "Run skill-gap analysis for a teacher (Gap Engine v1)",

  async handle(
    intent: IntentEmission & { payload: SkillGapRefreshRequestedPayload },
    context: HandlerContext,
  ): Promise<HandlerResult> {
    const { teacherId, jobId, triggeredBy } = intent.payload;

    console.debug("[GapRefreshHandler] Intent received", {
      teacherId,
      jobId: jobId ?? "general",
      triggeredBy,
      executedAt: context.executedAt,
    });

    const outcome = await refreshGaps({
      teacherId,
      jobId: jobId ?? null,
      triggeredByEvent: triggeredBy,
      triggeredAt: context.executedAt,
    });

    return {
      intent: intent.intent,
      handlerExecuted: "gap-refresh-handler-v1",
      outputsWritten: outcome.snapshotWritten ? ["intelligence_gap_snapshots"] : [],
      executionTimeMs: 0,
      success: outcome.success,
      error: outcome.error,
    };
  },
};
