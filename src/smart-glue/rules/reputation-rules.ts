/**
 * Smart Glue — Reputation Rules — Sprint 8B
 *
 * Maps domain events to reputation.profile_refresh_requested intent.
 */

import type { GlueRule } from "../types";
import { EVENT_NAMES } from "@/contracts/core/event-names";

interface TeacherEvent {
  event: string;
  payload: { teacherId: string; [key: string]: unknown };
}

function extractTeacherId(event: TeacherEvent, eventType: string) {
  return [{
    intent: EVENT_NAMES.intents.reputationRefreshRequested,
    payload: { teacherId: event.payload.teacherId, triggeredBy: event.event, eventType },
  }];
}

export const reputationRules: GlueRule[] = [
  {
    id: "rep-verified-completion",
    description: "Verified completion → reputation refresh",
    trigger: EVENT_NAMES.training.verifiedCompletion,
    emitIntents: (event) => extractTeacherId(event, "verified_completion"),
  },
  {
    id: "rep-mentor-approved",
    description: "Mentor approval → reputation refresh",
    trigger: EVENT_NAMES.training.mentorReviewApproved,
    emitIntents: (event) => extractTeacherId(event, "mentor_review_approved"),
  },
  {
    id: "rep-credential-issued",
    description: "Credential issued → reputation refresh",
    trigger: EVENT_NAMES.trust.credentialIssued,
    emitIntents: (event) => extractTeacherId(event, "credential_issued"),
  },
  {
    id: "rep-pathway-completed",
    description: "Pathway completed → reputation refresh",
    trigger: EVENT_NAMES.training.pathwayCompleted,
    emitIntents: (event) => extractTeacherId(event, "pathway_completed"),
  },
  {
    id: "rep-training-completed",
    description: "Training completed → reputation refresh",
    trigger: EVENT_NAMES.training.completed,
    emitIntents: (event) => extractTeacherId(event, "training_completed"),
  },
  {
    id: "rep-career-stage-updated",
    description: "Career stage advanced → reputation refresh",
    trigger: EVENT_NAMES.intelligence.careerStageUpdated,
    emitIntents: (event) => extractTeacherId(event, "career_stage_advanced"),
  },
];
