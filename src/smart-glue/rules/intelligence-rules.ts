/**
 * Smart Glue Rules — Intelligence Domain
 *
 * Maps intelligence output events to downstream intents.
 * When match scores change, gaps and recommendations should be refreshed.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule } from "../types";

/** When a match score is updated → refresh gaps + recommendations for the teacher */
export const onMatchScoreUpdated: GlueRule<"intelligence.match_score_updated"> = {
  id: "intelligence.match_score_updated→gap+recommendation_refresh",
  description: "Refresh gap analysis and recommendations when match score changes",
  trigger: EVENT_NAMES.intelligence.matchScoreUpdated,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.skillGapRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        jobId: event.payload.jobId,
        triggeredBy: EVENT_NAMES.intelligence.matchScoreUpdated,
      },
    },
    {
      intent: EVENT_NAMES.intents.trainingRecommendationRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.intelligence.matchScoreUpdated,
      },
    },
  ],
};

export const intelligenceRules = [onMatchScoreUpdated];
