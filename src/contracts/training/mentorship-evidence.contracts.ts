/**
 * Mentorship Evidence Domain Contracts
 *
 * Covers the evidence lifecycle within mentorship sessions.
 * Evidence flows: submitted → approved | rejected
 * (under_review removed — no concurrent review queue yet)
 */
import type { DomainEvent } from "../core/domain-event";

// ── Types ──

export type MentorshipEvidenceType =
  | "lesson_plan"
  | "classroom_video"
  | "teaching_artifact"
  | "student_work"
  | "reflection_document";

/** Simplified lifecycle: no under_review state */
export type MentorshipEvidenceStatus =
  | "submitted"
  | "approved"
  | "rejected";

export type SessionOutcome =
  | "guidance_session"
  | "skill_feedback"
  | "lesson_review"
  | "career_advice"
  | "practice_coaching"
  | "remediation_support";

// ── Domain Events ──

/** Emitted when a teacher submits evidence for a completed mentor session. */
export interface MentorshipEvidenceSubmittedPayload {
  evidenceId: string;
  sessionId: string;
  teacherId: string;
  mentorId: string;
}

export type MentorshipEvidenceSubmittedEvent = DomainEvent<MentorshipEvidenceSubmittedPayload>;

/** Emitted when a mentor approves mentorship evidence — validated growth signal. */
export interface MentorshipEvidenceApprovedPayload {
  evidenceId: string;
  sessionId: string;
  teacherId: string;
  mentorId: string;
  competencyTermIds: string[];
}

export type MentorshipEvidenceApprovedEvent = DomainEvent<MentorshipEvidenceApprovedPayload>;

/** Emitted when a mentor rejects mentorship evidence. */
export interface MentorshipEvidenceRejectedPayload {
  evidenceId: string;
  sessionId: string;
  teacherId: string;
  mentorId: string;
  reviewNotes: string;
}

export type MentorshipEvidenceRejectedEvent = DomainEvent<MentorshipEvidenceRejectedPayload>;
