/**
 * Smart Glue Rules — Growth Recommendation Triggers — Sprint 7C
 *
 * Maps hiring and training events to growth recommendation refresh intents.
 * Closes the loop: hiring outcome → growth recommendation.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule } from "../types";

/** When application is rejected → generate growth recommendations */
export const onRejectionRefreshGrowth: GlueRule<"hiring.application_rejected"> = {
  id: "hiring.application_rejected→growth_recommendation_refresh",
  description: "Generate growth recommendations when application is rejected",
  trigger: EVENT_NAMES.hiring.applicationRejected,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.hiring.applicationRejected,
        rejectionReasonTermId: event.payload.rejectionReasonTermId,
        jobId: event.payload.jobId,
      },
    },
  ],
};

/** When training completes → refresh growth recs (may mark some completed) */
export const onTrainingCompletedRefreshGrowth: GlueRule<"training.completed"> = {
  id: "training.completed→growth_recommendation_refresh",
  description: "Refresh growth recommendations when training completes",
  trigger: EVENT_NAMES.training.completed,
  priority: -20, // After talent profile refresh
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.completed,
      },
    },
  ],
};

/** When verified completion → refresh growth recs */
export const onVerifiedCompletionRefreshGrowth: GlueRule<"training.verified_completion"> = {
  id: "training.verified_completion→growth_recommendation_refresh",
  description: "Refresh growth recommendations on verified completion",
  trigger: EVENT_NAMES.training.verifiedCompletion,
  priority: -20,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.verifiedCompletion,
      },
    },
  ],
};

/** When credential is issued → refresh growth recs */
export const onCredentialIssuedRefreshGrowth: GlueRule<"trust.credential_issued"> = {
  id: "trust.credential_issued→growth_recommendation_refresh",
  description: "Refresh growth recommendations when credential is issued",
  trigger: EVENT_NAMES.trust.credentialIssued,
  priority: -20,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.trust.credentialIssued,
      },
    },
  ],
};

/** When evidence is submitted → refresh growth recs */
export const onEvidenceSubmittedRefreshGrowth: GlueRule<"training.evidence.submitted"> = {
  id: "training.evidence.submitted→growth_recommendation_refresh",
  description: "Refresh growth recommendations when evidence is submitted",
  trigger: EVENT_NAMES.training.evidenceSubmitted,
  priority: -20,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.evidenceSubmitted,
      },
    },
  ],
};

/** When mentor approves → refresh growth recs */
export const onMentorApprovalRefreshGrowth: GlueRule<"training.mentor.review.approved"> = {
  id: "training.mentor.review.approved→growth_recommendation_refresh",
  description: "Refresh growth recommendations when mentor approves evidence",
  trigger: EVENT_NAMES.training.mentorReviewApproved,
  priority: -20,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.mentorReviewApproved,
      },
    },
  ],
};

export const growthRules = [
  onRejectionRefreshGrowth,
  onTrainingCompletedRefreshGrowth,
  onVerifiedCompletionRefreshGrowth,
  onCredentialIssuedRefreshGrowth,
  onEvidenceSubmittedRefreshGrowth,
  onMentorApprovalRefreshGrowth,
];
