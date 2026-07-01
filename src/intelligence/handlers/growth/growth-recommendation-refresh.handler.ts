/**
 * Growth Recommendation Refresh Handler — Sprint 7C
 *
 * Processes intent.growth_recommendation_refresh_requested.
 * Delegates to the growth refresh service.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { GrowthRecommendationRefreshRequestedPayload } from "@/contracts/smart-glue/intent.contracts";
import type { IntentEmission } from "@/smart-glue/types";
import { refreshGrowthRecommendations } from "@/intelligence/growth/growth-refresh.service";

export const growthRecommendationRefreshHandler: IntentHandler<GrowthRecommendationRefreshRequestedPayload> = {
  intentName: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
  description: "Generate growth recommendations from hiring outcomes",

  async handle(
    intent: IntentEmission & { payload: GrowthRecommendationRefreshRequestedPayload },
    context: HandlerContext,
  ): Promise<HandlerResult> {
    const { teacherId, triggeredBy } = intent.payload;

    console.log(`[GrowthHandler] Intent received`, {
      teacherId,
      triggeredBy,
      executedAt: context.executedAt,
    });

    const result = await refreshGrowthRecommendations({
      teacherId,
      triggeredBy,
      traceId: context.traceId,
    });

    return {
      intent: intent.intent,
      handlerExecuted: "growth-recommendation-refresh-handler",
      outputsWritten: result.success ? ["growth_recommendations"] : [],
      executionTimeMs: 0,
      success: result.success,
      error: result.error,
    };
  },
};
