/**
 * Smart Glue Rules — Admin Domain (Sprint 13)
 *
 * Maps admin-authority actions to intelligence intents.
 * Admin actions are high-trust signals that affect:
 *   - Mentor reputation (review moderation)
 *   - Teacher trust/readiness (verification, credential confirmation)
 *   - Content visibility (provider content approval)
 *
 * No scoring logic. No direct domain coupling.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule } from "../types";

/**
 * Admin approves a mentor session review → refresh mentor reputation.
 * This is a high-trust signal: admin-moderated reviews feed into
 * mentor rating aggregates and directory visibility.
 */
export const onAdminReviewApproved: GlueRule<"admin.review_approved"> = {
  id: "admin.review_approved→mentor_reputation",
  description: "Refresh mentor reputation when admin approves a session review",
  trigger: EVENT_NAMES.admin.reviewApproved,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.mentorReputationRefreshRequested,
      payload: {
        mentorId: event.payload.mentorId,
        triggeredBy: EVENT_NAMES.admin.reviewApproved,
      },
    },
  ],
};

/**
 * Admin rejects a mentor session review → refresh mentor reputation.
 * Rejection removes the review from aggregates, which may lower the mentor's score.
 */
export const onAdminReviewRejected: GlueRule<"admin.review_rejected"> = {
  id: "admin.review_rejected→mentor_reputation",
  description: "Refresh mentor reputation when admin rejects a session review",
  trigger: EVENT_NAMES.admin.reviewRejected,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.mentorReputationRefreshRequested,
      payload: {
        mentorId: event.payload.mentorId,
        triggeredBy: EVENT_NAMES.admin.reviewRejected,
      },
    },
  ],
};

/**
 * Admin approves provider content → refresh workforce intelligence.
 * Approved content increases the platform's training catalog coverage,
 * which may affect school gap analysis and recommendation availability.
 */
export const onAdminContentApproved: GlueRule<"admin.content_approved"> = {
  id: "admin.content_approved→workforce_refresh",
  description: "Refresh workforce intelligence when admin approves provider content",
  trigger: EVENT_NAMES.admin.contentApproved,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.workforceRefreshRequested,
      payload: {
        teacherId: "__platform__", // Platform-wide signal, not teacher-specific
        triggeredBy: EVENT_NAMES.admin.contentApproved,
      },
    },
  ],
};

export const adminRules = [
  onAdminReviewApproved,
  onAdminReviewRejected,
  onAdminContentApproved,
];
