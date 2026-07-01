import type { DomainEvent } from "../core/domain-event";

/**
 * Training Domain Contracts
 *
 * Covers training lifecycle events.
 *
 * Phase 1 — Smart Domain Contracts Foundation
 */

/**
 * Emitted when a teacher completes a training course or pathway.
 *
 * Produced by: Training domain
 * Future consumers: Trust, Intelligence, Hiring
 */
export interface TrainingCompletedPayload {
  teacherId: string;
  courseId: string;
  pathwayId?: string | null;
  skillIds: string[];
  evidenceType: "certificate" | "practice";
  completedAt: string;
  /** Sprint 14: Provider attribution — derived from training_items.provider_id */
  providerId?: string | null;
}

export type TrainingCompletedEvent = DomainEvent<TrainingCompletedPayload>;

/* ── Preserved payload types for event-map compatibility ────── */

export interface CourseCompletedPayload extends TrainingCompletedPayload {}

export interface CourseEnrolledPayload {
  userId: string;
  trainingItemId: string;
  trainingType: string;
}

export interface CredentialEarnedPayload {
  userId: string;
  teacherId: string;
  trainingItemId: string;
  sourceType: "training_item" | "training_package" | "training_pathway";
  credentialKind: "badge" | "certificate";
  credentialTypeTermId?: string;
  verificationCode: string;
  earnedAt: string;
}

export interface PathwayStartedPayload {
  userId: string;
  pathwayId: string;
}

export interface PathwayStageCompletedPayload {
  userId: string;
  pathwayId: string;
  stageId: string;
  stageOrder: number;
}
