/**
 * Smart Glue Rules — Career Path Refresh Triggers — Sprint 8A
 *
 * Maps key lifecycle events to career state recomputation.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule } from "../types";

export const onTrainingCompletedRefreshCareer: GlueRule<"training.completed"> = {
  id: "training.completed→career_state_refresh",
  description: "Refresh career state when training completes",
  trigger: EVENT_NAMES.training.completed,
  priority: -30,
  emitIntents: (event) => [{
    intent: EVENT_NAMES.intents.careerStateRefreshRequested,
    payload: { teacherId: event.payload.teacherId, triggeredBy: EVENT_NAMES.training.completed },
  }],
};

export const onVerifiedCompletionRefreshCareer: GlueRule<"training.verified_completion"> = {
  id: "training.verified_completion→career_state_refresh",
  description: "Refresh career state on verified completion",
  trigger: EVENT_NAMES.training.verifiedCompletion,
  priority: -30,
  emitIntents: (event) => [{
    intent: EVENT_NAMES.intents.careerStateRefreshRequested,
    payload: { teacherId: event.payload.teacherId, triggeredBy: EVENT_NAMES.training.verifiedCompletion },
  }],
};

export const onCredentialIssuedRefreshCareer: GlueRule<"trust.credential_issued"> = {
  id: "trust.credential_issued→career_state_refresh",
  description: "Refresh career state when credential is issued",
  trigger: EVENT_NAMES.trust.credentialIssued,
  priority: -30,
  emitIntents: (event) => [{
    intent: EVENT_NAMES.intents.careerStateRefreshRequested,
    payload: { teacherId: event.payload.teacherId, triggeredBy: EVENT_NAMES.trust.credentialIssued },
  }],
};

export const onMentorApprovalRefreshCareer: GlueRule<"training.mentor.review.approved"> = {
  id: "training.mentor.review.approved→career_state_refresh",
  description: "Refresh career state when mentor approves evidence",
  trigger: EVENT_NAMES.training.mentorReviewApproved,
  priority: -30,
  emitIntents: (event) => [{
    intent: EVENT_NAMES.intents.careerStateRefreshRequested,
    payload: { teacherId: event.payload.teacherId, triggeredBy: EVENT_NAMES.training.mentorReviewApproved },
  }],
};

export const onTalentProfileRefreshCareer: GlueRule<"intelligence.talent_profile.updated"> = {
  id: "intelligence.talent_profile.updated→career_state_refresh",
  description: "Refresh career state when talent profile updates",
  trigger: EVENT_NAMES.intelligence.talentProfileUpdated,
  priority: -30,
  emitIntents: (event) => [{
    intent: EVENT_NAMES.intents.careerStateRefreshRequested,
    payload: { teacherId: event.payload.teacherId, triggeredBy: EVENT_NAMES.intelligence.talentProfileUpdated },
  }],
};

export const onProfileUpdatedRefreshCareer: GlueRule<"identity.profile_updated"> = {
  id: "identity.profile_updated→career_state_refresh",
  description: "Refresh career state when profile updates",
  trigger: EVENT_NAMES.identity.profileUpdated,
  priority: -30,
  emitIntents: (event) => [{
    intent: EVENT_NAMES.intents.careerStateRefreshRequested,
    payload: { teacherId: event.payload.userId, triggeredBy: EVENT_NAMES.identity.profileUpdated },
  }],
};

export const careerPathRules = [
  onTrainingCompletedRefreshCareer,
  onVerifiedCompletionRefreshCareer,
  onCredentialIssuedRefreshCareer,
  onMentorApprovalRefreshCareer,
  onTalentProfileRefreshCareer,
  onProfileUpdatedRefreshCareer,
];
