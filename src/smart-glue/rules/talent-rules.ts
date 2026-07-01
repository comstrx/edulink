/**
 * Smart Glue Rules — Talent Intelligence Refresh
 *
 * Triggers talent profile refresh when upstream intelligence outputs change.
 * Downstream from CRI, gap, credential, and training events.
 *
 * Pre-Sprint 10: Removed onCriUpdatedRefreshTalent (was noop placeholder).
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule } from "../types";

/** When training completes → refresh talent profile */
export const onTrainingCompletedRefreshTalent: GlueRule<"training.completed"> = {
  id: "training.completed→talent_profile_refresh",
  description: "Refresh talent intelligence profile when training completes",
  trigger: EVENT_NAMES.training.completed,
  priority: -10, // Lower priority — runs after CRI/gap refreshes
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.completed,
      },
    },
  ],
};

/** When verified completion occurs → refresh talent profile */
export const onVerifiedCompletionRefreshTalent: GlueRule<"training.verified_completion"> = {
  id: "training.verified_completion→talent_profile_refresh",
  description: "Refresh talent profile on verified completion",
  trigger: EVENT_NAMES.training.verifiedCompletion,
  priority: -10,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.verifiedCompletion,
      },
    },
  ],
};

/** When credential is issued → refresh talent profile */
export const onCredentialIssuedRefreshTalent: GlueRule<"trust.credential_issued"> = {
  id: "trust.credential_issued→talent_profile_refresh",
  description: "Refresh talent profile when credential is issued",
  trigger: EVENT_NAMES.trust.credentialIssued,
  priority: -10,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.trust.credentialIssued,
      },
    },
  ],
};

/** When mentor approves evidence → refresh talent profile */
export const onMentorApprovalRefreshTalent: GlueRule<"training.mentor.review.approved"> = {
  id: "training.mentor.review.approved→talent_profile_refresh",
  description: "Refresh talent profile when mentor approves evidence",
  trigger: EVENT_NAMES.training.mentorReviewApproved,
  priority: -10,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.mentorReviewApproved,
      },
    },
  ],
};

/** When pathway completes → refresh talent profile */
export const onPathwayCompletedRefreshTalent: GlueRule<"training.pathway.completed"> = {
  id: "training.pathway.completed→talent_profile_refresh",
  description: "Refresh talent profile when pathway completes",
  trigger: EVENT_NAMES.training.pathwayCompleted,
  priority: -10,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.pathwayCompleted,
      },
    },
  ],
};

export const talentRules = [
  onTrainingCompletedRefreshTalent,
  onVerifiedCompletionRefreshTalent,
  onCredentialIssuedRefreshTalent,
  onMentorApprovalRefreshTalent,
  onPathwayCompletedRefreshTalent,
];
