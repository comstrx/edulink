/**
 * CRI Refresh Handler
 *
 * Processes intent.cri_refresh_requested.
 * Thin delegation layer — all logic lives in the CRI service and engine.
 *
 * Phase 4D — Updated to use CRI Engine v1 pipeline
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { CriRefreshRequestedPayload } from "@/contracts/smart-glue/intent.contracts";
import type { IntentEmission } from "@/smart-glue/types";
import { refreshCri } from "@/intelligence/cri/services/cri-refresh.service";

export const criRefreshHandler: IntentHandler<CriRefreshRequestedPayload> = {
  intentName: EVENT_NAMES.intents.criRefreshRequested,
  description: "Recompute Career Readiness Index for a teacher via CRI Engine v1",

  async handle(
    intent: IntentEmission & { payload: CriRefreshRequestedPayload },
    context: HandlerContext,
  ): Promise<HandlerResult> {
    const { teacherId, jobId, triggeredBy } = intent.payload;

    console.log(`[CriRefreshHandler] Intent received`, {
      teacherId,
      jobId: jobId ?? "general",
      triggeredBy,
      executedAt: context.executedAt,
    });

    // Delegate entirely to CRI refresh service
    const outcome = await refreshCri({
      teacherId,
      jobId: jobId ?? undefined,
      triggeredByEvent: triggeredBy,
      triggeredAt: context.executedAt,
    });

    console.log(`[CriRefreshHandler] Pipeline completed`, {
      teacherId,
      success: outcome.success,
      criScore: outcome.criResult?.criScore,
      criBand: outcome.criResult?.criBand,
      snapshotWritten: outcome.snapshotWritten,
    });

    return {
      intent: intent.intent,
      handlerExecuted: "cri-refresh-handler-v1",
      outputsWritten: outcome.snapshotWritten ? ["intelligence_cri_snapshots"] : [],
      executionTimeMs: 0,
      success: outcome.success,
      error: outcome.error,
    };
  },
};
