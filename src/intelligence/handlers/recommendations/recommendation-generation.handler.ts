/**
 * Recommendation Generation Handler
 *
 * Processes intent.training_recommendation_requested.
 * Thin handler — delegates to RecommendationRefreshService.
 *
 * Phase 7D — Live Implementation
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { TrainingRecommendationRequestedPayload } from "@/contracts/smart-glue/intent.contracts";
import type { IntentEmission } from "@/smart-glue/types";
import { refreshRecommendations } from "@/intelligence/recommendations/services/recommendation-refresh.service";

export const recommendationGenerationHandler: IntentHandler<TrainingRecommendationRequestedPayload> = {
  intentName: EVENT_NAMES.intents.trainingRecommendationRequested,
  description: "Generate training recommendations based on skill gaps",

  async handle(
    intent: IntentEmission & { payload: TrainingRecommendationRequestedPayload },
    context: HandlerContext,
  ): Promise<HandlerResult> {
    const { teacherId, triggeredBy } = intent.payload;

    console.log(`[RecommendationHandler] Intent received`, {
      teacherId,
      triggeredBy,
      executedAt: context.executedAt,
    });

    const outcome = await refreshRecommendations({
      teacherId,
      triggeredBy,
    });

    return {
      intent: intent.intent,
      handlerExecuted: "recommendation-generation-handler",
      outputsWritten: outcome.snapshotWritten ? ["intelligence_recommendation_snapshots"] : [],
      executionTimeMs: 0,
      success: outcome.success,
      error: outcome.error,
    };
  },
};
