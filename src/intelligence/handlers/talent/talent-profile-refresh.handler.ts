/**
 * Talent Profile Refresh Handler
 *
 * Intent handler registered in the handler registry.
 * Invoked by Smart Glue when talent profile refresh is needed.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

import type { IntentHandler, HandlerResult, HandlerContext } from "../core/intent-handler.types";
import type { IntentEmission } from "@/smart-glue/types";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { refreshTalentProfile } from "@/intelligence/talent/talent-refresh.service";

export const talentProfileRefreshHandler: IntentHandler = {
  intentName: EVENT_NAMES.intents.talentProfileRefreshRequested,
  description: "Refreshes the aggregated talent intelligence profile for a teacher",

  async handle(
    intent: IntentEmission,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    const start = Date.now();
    const teacherId = intent.payload.teacherId as string;

    if (!teacherId) {
      return {
        intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
        handlerExecuted: "talent-profile-refresh",
        outputsWritten: [],
        executionTimeMs: Date.now() - start,
        success: false,
        error: "Missing teacherId",
      };
    }

    const result = await refreshTalentProfile(teacherId);

    return {
      intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
      handlerExecuted: "talent-profile-refresh",
      outputsWritten: result.success ? ["intelligence_talent_profiles"] : [],
      executionTimeMs: Date.now() - start,
      success: result.success,
      error: result.error,
    };
  },
};
