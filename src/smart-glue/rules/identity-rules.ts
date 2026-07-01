/**
 * Smart Glue Rules — Identity Domain
 *
 * Maps identity events to intelligence intents.
 * No scoring logic. No direct coupling to other domain internals.
 *
 * Sprint 11: Decision Engine integration — skips recomputation on cosmetic changes.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule } from "../types";
import {
  readProfileUpdateContext,
  type ProfileUpdateDecisionContext,
} from "../intelligence/profile-update-context.reader";
import { resolveProfileUpdateDecision } from "../decision-engine";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";

/** When teacher profile is updated → Decision Engine determines response (Sprint 11) */
export const onProfileUpdated: GlueRule<"identity.profile_updated"> = {
  id: "identity.profile_updated→decision_engine",
  description: "Decision Engine–driven intelligence refresh on profile update (skips cosmetic changes)",
  trigger: EVENT_NAMES.identity.profileUpdated,
  condition: (event) => event.payload.profileType === "teacher",

  resolveContext: async (event) => {
    // Use canonical teacherId (teacher_profiles.id), fallback to userId for backward compat
    const resolvedId = event.payload.teacherId ?? event.payload.userId;
    return readProfileUpdateContext(resolvedId, event.payload.updatedFields);
  },

  emitIntents: (event, rawContext) => {
    // Canonical teacher identity for all downstream intents
    const teacherId = event.payload.teacherId ?? event.payload.userId;
    const ctx = rawContext as ProfileUpdateDecisionContext | undefined;
    const traceId = `rule_prof_${Date.now().toString(36)}`;
    const decision = resolveProfileUpdateDecision(ctx, traceId);

    // Decision: skip entirely for cosmetic changes
    if (!decision.shouldRecompute) {
      logDecisionTrace({
        traceId,
        decisionType: "profile_update",
        entityId: teacherId,
        eventName: "identity.profile_updated",
        metadata: {
          action: "skip",
          reasoning: decision.reasoning,
        },
      });
      return [];
    }

    const intents = [];
    const priorityMeta = { priority: decision.priority };

    if (decision.shouldRefreshCri) {
      intents.push({
        intent: EVENT_NAMES.intents.criRefreshRequested,
        payload: {
          teacherId,
          triggeredBy: EVENT_NAMES.identity.profileUpdated,
          ...priorityMeta,
        },
      });
    }

    if (decision.shouldRefreshMatch) {
      intents.push({
        intent: EVENT_NAMES.intents.matchRefreshRequested,
        payload: {
          teacherId,
          triggeredBy: EVENT_NAMES.identity.profileUpdated,
          ...priorityMeta,
        },
      });
    }

    if (decision.shouldRefreshGaps) {
      intents.push({
        intent: EVENT_NAMES.intents.skillGapRefreshRequested,
        payload: {
          teacherId,
          triggeredBy: EVENT_NAMES.identity.profileUpdated,
          ...priorityMeta,
        },
      });
    }

    // Sprint 12: Trigger growth recommendation refresh on profile update
    intents.push({
      intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      payload: {
        teacherId,
        triggeredBy: EVENT_NAMES.identity.profileUpdated,
        ...priorityMeta,
      },
    });

    const limited = intents.slice(0, decision.maxIntents);

    logDecisionTrace({
      traceId,
      decisionType: "profile_update",
      entityId: teacherId,
      eventName: "identity.profile_updated",
      metadata: {
        priority: decision.priority,
        intentsRequested: intents.length,
        intentsEmitted: limited.length,
        reasoning: decision.reasoning,
      },
    });

    return limited;
  },
};

export const identityRules = [onProfileUpdated];
