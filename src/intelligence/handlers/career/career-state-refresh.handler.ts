/**
 * Career State Refresh Handler — Sprint 8A
 *
 * Intent handler for career state recomputation.
 */

import type { IntentHandler } from "../core/intent-handler.types";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { refreshCareerState } from "@/career/paths/career-state-refresh.service";

export const careerStateRefreshHandler: IntentHandler = {
  intentName: EVENT_NAMES.intents.careerStateRefreshRequested,
  description: "Refreshes the teacher's career path state evaluation",

  async handle(intent, context) {
    const start = Date.now();
    const teacherId = intent.payload.teacherId as string;

    if (!teacherId) {
      return {
        intent: intent.intent,
        handlerExecuted: "careerStateRefreshHandler",
        outputsWritten: [],
        executionTimeMs: Date.now() - start,
        success: false,
        error: "Missing teacherId",
      };
    }

    const result = await refreshCareerState(teacherId);

    return {
      intent: intent.intent,
      handlerExecuted: "careerStateRefreshHandler",
      outputsWritten: result.success ? ["teacher_career_states"] : [],
      executionTimeMs: Date.now() - start,
      success: result.success,
      error: result.error,
    };
  },
};
