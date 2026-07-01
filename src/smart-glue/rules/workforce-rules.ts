/**
 * Smart Glue Rules — Workforce Intelligence — Sprint 8D
 *
 * Maps domain events that affect workforce state to
 * the workforce refresh intent.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule, IntentEmission } from "../types";
import type { DomainEvent } from "@/contracts/core/domain-event";

function workforceEmitter(triggeredBy: string) {
  return (event: DomainEvent<any>): IntentEmission[] => [
    {
      intent: EVENT_NAMES.intents.workforceRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy,
      },
    },
  ];
}

export const workforceRules: GlueRule[] = [
  {
    id: "workforce-on-career-stage-updated",
    trigger: EVENT_NAMES.intelligence.careerStageUpdated,
    description: "Career stage change triggers workforce refresh",
    emitIntents: workforceEmitter(EVENT_NAMES.intelligence.careerStageUpdated),
  },
  {
    id: "workforce-on-reputation-updated",
    trigger: EVENT_NAMES.intelligence.reputationProfileUpdated,
    description: "Reputation change triggers workforce refresh",
    emitIntents: workforceEmitter(EVENT_NAMES.intelligence.reputationProfileUpdated),
  },
  {
    id: "workforce-on-credential-issued",
    trigger: EVENT_NAMES.trust.credentialIssued,
    description: "Credential issued triggers workforce refresh",
    emitIntents: workforceEmitter(EVENT_NAMES.trust.credentialIssued),
  },
  {
    id: "workforce-on-training-completed",
    trigger: EVENT_NAMES.training.completed,
    description: "Training completion triggers workforce refresh",
    emitIntents: workforceEmitter(EVENT_NAMES.training.completed),
  },
  {
    id: "workforce-on-mobility-updated",
    trigger: EVENT_NAMES.intelligence.mobilityStateUpdated,
    description: "Mobility state change triggers workforce refresh",
    emitIntents: workforceEmitter(EVENT_NAMES.intelligence.mobilityStateUpdated),
  },
  {
    id: "workforce-on-verification-completed",
    trigger: EVENT_NAMES.trust.verificationCompleted,
    description: "Verification approval triggers workforce refresh (team capability update)",
    condition: (event) => event.payload.status === "approved",
    emitIntents: workforceEmitter(EVENT_NAMES.trust.verificationCompleted),
  },
];
