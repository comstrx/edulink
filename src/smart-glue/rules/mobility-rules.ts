/**
 * Smart Glue — Mobility Rules — Sprint 8C
 *
 * Maps domain events to mobility.refresh_requested intent.
 */

import type { GlueRule } from "../types";
import { EVENT_NAMES } from "@/contracts/core/event-names";

export const mobilityRules: GlueRule[] = [
  {
    id: "mob-training-completed",
    description: "Training completed → mobility refresh",
    trigger: EVENT_NAMES.training.completed,
    emitIntents: (event) => [{
      intent: EVENT_NAMES.intents.mobilityRefreshRequested,
      payload: { teacherId: (event.payload as any).teacherId, triggeredBy: event.event },
    }],
  },
  {
    id: "mob-verified-completion",
    description: "Verified completion → mobility refresh",
    trigger: EVENT_NAMES.training.verifiedCompletion,
    emitIntents: (event) => [{
      intent: EVENT_NAMES.intents.mobilityRefreshRequested,
      payload: { teacherId: (event.payload as any).teacherId, triggeredBy: event.event },
    }],
  },
  {
    id: "mob-credential-issued",
    description: "Credential issued → mobility refresh",
    trigger: EVENT_NAMES.trust.credentialIssued,
    emitIntents: (event) => [{
      intent: EVENT_NAMES.intents.mobilityRefreshRequested,
      payload: { teacherId: (event.payload as any).teacherId, triggeredBy: event.event },
    }],
  },
  {
    id: "mob-career-stage-updated",
    description: "Career stage updated → mobility refresh",
    trigger: EVENT_NAMES.intelligence.careerStageUpdated,
    emitIntents: (event) => [{
      intent: EVENT_NAMES.intents.mobilityRefreshRequested,
      payload: { teacherId: (event.payload as any).teacherId, triggeredBy: event.event },
    }],
  },
  {
    id: "mob-reputation-updated",
    description: "Reputation updated → mobility refresh",
    trigger: EVENT_NAMES.intelligence.reputationProfileUpdated,
    emitIntents: (event) => [{
      intent: EVENT_NAMES.intents.mobilityRefreshRequested,
      payload: { teacherId: (event.payload as any).teacherId, triggeredBy: event.event },
    }],
  },
  {
    id: "mob-talent-profile-updated",
    description: "Talent profile updated → mobility refresh",
    trigger: EVENT_NAMES.intelligence.talentProfileUpdated,
    emitIntents: (event) => [{
      intent: EVENT_NAMES.intents.mobilityRefreshRequested,
      payload: { teacherId: (event.payload as any).teacherId, triggeredBy: event.event },
    }],
  },
];
