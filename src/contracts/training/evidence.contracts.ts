import type { DomainEvent } from "../core/domain-event";

/**
 * Training Evidence Domain Contracts — Sprint 6D
 *
 * Covers evidence submission, reflection, and assessment lifecycle events.
 *
 * Phase 6 — Professional Growth Engine
 */

// ── Evidence Types ──

export type EvidenceType =
  | "lesson_plan"
  | "classroom_video"
  | "teaching_artifact"
  | "reflection"
  | "assessment_submission"
  | "other";

export type EvidenceReviewStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_revision";

// ── Domain Events ──

/**
 * Emitted when a teacher submits evidence for an execution.
 *
 * Produced by: Training domain (evidence submission)
 * Future consumers: Mentor queue, Intelligence (CRI), Notifications
 */
export interface EvidenceSubmittedPayload {
  teacherId: string;
  executionId: string;
  evidenceId: string;
  evidenceType: EvidenceType;
  itemId: string;
  itemType: string;
  milestoneId?: string | null;
  submittedAt: string;
}

export type EvidenceSubmittedEvent = DomainEvent<EvidenceSubmittedPayload>;

/**
 * Emitted when evidence review status changes.
 *
 * Produced by: Training domain (review engine)
 * Future consumers: Notifications, Progress engine (verified completion)
 */
export interface EvidenceReviewUpdatedPayload {
  teacherId: string;
  evidenceId: string;
  executionId: string;
  previousStatus: EvidenceReviewStatus;
  newStatus: EvidenceReviewStatus;
  reviewerId?: string | null;
  updatedAt: string;
}

export type EvidenceReviewUpdatedEvent = DomainEvent<EvidenceReviewUpdatedPayload>;

/**
 * Emitted when evidence is deleted.
 *
 * Produced by: Training domain
 * Future consumers: Cleanup, Intelligence
 */
export interface EvidenceDeletedPayload {
  teacherId: string;
  evidenceId: string;
  executionId: string;
  deletedAt: string;
}

export type EvidenceDeletedEvent = DomainEvent<EvidenceDeletedPayload>;

/**
 * Emitted when a teacher submits a pathway reflection.
 *
 * Produced by: Training domain (reflection submission)
 * Future consumers: Mentor review, Intelligence
 */
export interface ReflectionSubmittedPayload {
  teacherId: string;
  pathwayExecutionId: string;
  reflectionId: string;
  promptId: string;
  submittedAt: string;
}

export type ReflectionSubmittedEvent = DomainEvent<ReflectionSubmittedPayload>;
