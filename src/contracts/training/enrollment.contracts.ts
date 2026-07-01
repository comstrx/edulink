import type { DomainEvent } from "../core/domain-event";

/**
 * Training Enrollment Domain Contracts
 *
 * Covers the enrollment lifecycle events introduced in Sprint 6A.
 *
 * Phase 6 — Professional Growth Engine
 */

// ── Enrollment Lifecycle ──

export type EnrollmentStatus = "enrolled" | "active" | "completed" | "cancelled" | "dropped";
export type EnrollmentSource = "self" | "school" | "pathway";

/**
 * Emitted when a teacher enrolls in a training item.
 *
 * Produced by: Training domain (enrollment service)
 * Future consumers: Intelligence (recommendations), Training (pathway cascade)
 */
export interface TrainingEnrolledPayload {
  teacherId: string;
  itemId: string;
  itemType: "course" | "pathway";
  enrollmentSource: EnrollmentSource;
  enrollmentId: string;
  assignmentId?: string | null;
  enrolledAt: string;
}

export type TrainingEnrolledEvent = DomainEvent<TrainingEnrolledPayload>;

/**
 * Emitted when a training execution starts (learning begins).
 *
 * Produced by: Training domain (execution activation)
 * Future consumers: Intelligence (activity tracking), Training (progress init)
 */
export interface ExecutionStartedPayload {
  teacherId: string;
  itemId: string;
  itemType: "course" | "pathway";
  executionId: string;
  enrollmentId: string;
  startedAt: string;
}

export type ExecutionStartedEvent = DomainEvent<ExecutionStartedPayload>;

/**
 * Emitted when a training execution completes.
 *
 * Produced by: Training domain (completion engine)
 * Future consumers: Trust (credential issuance), Intelligence (CRI), Training (pathway progress)
 */
export interface ExecutionCompletedPayload {
  teacherId: string;
  itemId: string;
  itemType: "course" | "pathway";
  executionId: string;
  enrollmentId: string;
  completedAt: string;
}

export type ExecutionCompletedEvent = DomainEvent<ExecutionCompletedPayload>;

// ── Pathway Runtime Events (Sprint 6B) ──

/**
 * Emitted when a pathway execution starts.
 *
 * Produced by: Training domain (pathway runtime)
 * Future consumers: Intelligence (pathway tracking)
 */
export interface PathwayExecutionStartedPayload {
  teacherId: string;
  pathwayId: string;
  pathwayExecutionId: string;
  enrollmentId: string;
  milestoneCount: number;
  requiredCourseCount: number;
  startedAt: string;
}

export type PathwayExecutionStartedEvent = DomainEvent<PathwayExecutionStartedPayload>;

/**
 * Emitted when a pathway milestone is completed.
 *
 * Produced by: Training domain (pathway runtime)
 * Future consumers: Intelligence (progress), Training (unlock next milestone)
 */
export interface PathwayMilestoneCompletedPayload {
  teacherId: string;
  pathwayId: string;
  pathwayExecutionId: string;
  milestoneId: string;
  milestoneOrder: number;
  completedAt: string;
}

export type PathwayMilestoneCompletedEvent = DomainEvent<PathwayMilestoneCompletedPayload>;

/**
 * Emitted when a pathway is fully completed.
 *
 * Produced by: Training domain (pathway runtime)
 * Future consumers: Trust (credential issuance), Intelligence (CRI)
 */
export interface PathwayCompletedPayload {
  teacherId: string;
  pathwayId: string;
  pathwayExecutionId: string;
  enrollmentId: string;
  completedAt: string;
}

export type PathwayCompletedEvent = DomainEvent<PathwayCompletedPayload>;

// ── Lifecycle constants ──

export const ENROLLABLE_TYPES = ["course", "pathway"] as const;
export type EnrollableType = (typeof ENROLLABLE_TYPES)[number];

export const NON_ENROLLABLE_TYPES = [
  "package", "library", "resource", "guide", "template", "toolkit",
] as const;
