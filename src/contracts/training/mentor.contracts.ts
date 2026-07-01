import type { DomainEvent } from "../core/domain-event";

/**
 * Mentor Validation Domain Contracts — Sprint 6E
 *
 * Covers mentor review lifecycle events for evidence validation.
 *
 * Phase 6 — Professional Growth Engine
 */

// ── Types ──

export type MentorStatus = "pending" | "active" | "inactive" | "suspended";

export type MentorReviewDecision = "approved" | "rejected" | "needs_revision";

// ── Domain Events ──

/**
 * Emitted when a mentor submits a review on evidence.
 *
 * Produced by: Training domain (mentor review)
 * Future consumers: Notifications, Progress, CRI
 */
export interface MentorReviewCreatedPayload {
  mentorId: string;
  teacherId: string;
  executionId: string;
  evidenceId: string;
  reviewId: string;
  decision: MentorReviewDecision;
  createdAt: string;
}

export type MentorReviewCreatedEvent = DomainEvent<MentorReviewCreatedPayload>;

/**
 * Emitted when mentor approves evidence.
 *
 * Produced by: Training domain
 * Future consumers: Progress (milestone verification), CRI, Credentials
 */
export interface MentorReviewApprovedPayload {
  mentorId: string;
  teacherId: string;
  executionId: string;
  evidenceId: string;
  reviewId: string;
  approvedAt: string;
}

export type MentorReviewApprovedEvent = DomainEvent<MentorReviewApprovedPayload>;

/**
 * Emitted when mentor rejects evidence.
 *
 * Produced by: Training domain
 * Future consumers: Notifications, Teacher feedback
 */
export interface MentorReviewRejectedPayload {
  mentorId: string;
  teacherId: string;
  executionId: string;
  evidenceId: string;
  reviewId: string;
  rejectedAt: string;
}

export type MentorReviewRejectedEvent = DomainEvent<MentorReviewRejectedPayload>;

/**
 * Emitted when mentor requests revision on evidence.
 *
 * Produced by: Training domain
 * Future consumers: Notifications, Teacher feedback
 */
export interface MentorRevisionRequestedPayload {
  mentorId: string;
  teacherId: string;
  executionId: string;
  evidenceId: string;
  reviewId: string;
  requestedAt: string;
}

export type MentorRevisionRequestedEvent = DomainEvent<MentorRevisionRequestedPayload>;

/**
 * Emitted when all evidence for an execution is mentor-approved,
 * upgrading completion to verified.
 *
 * Produced by: Training domain (mentor review engine)
 * Future consumers: Credentials, CRI, Hiring signals
 */
export interface VerifiedCompletionPayload {
  teacherId: string;
  executionId: string;
  mentorId: string;
  verifiedAt: string;
}

export type VerifiedCompletionEvent = DomainEvent<VerifiedCompletionPayload>;
