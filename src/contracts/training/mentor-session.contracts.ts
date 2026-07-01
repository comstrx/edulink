/**
 * Mentor Session Domain Contracts — Sprint B2-B
 *
 * Covers mentor booking and session lifecycle events.
 */
import type { DomainEvent } from "../core/domain-event";

// ── Types ──

export type MentorSessionStatus = "requested" | "confirmed" | "scheduled" | "completed" | "cancelled" | "declined" | "no_show";

// ── Domain Events ──

/** Emitted when a teacher requests a mentoring session. */
export interface MentorSessionRequestedPayload {
  sessionId: string;
  mentorId: string;
  teacherId: string;
  scheduledAt: string;
  durationMinutes: number;
}

export type MentorSessionRequestedEvent = DomainEvent<MentorSessionRequestedPayload>;

/** Emitted when a mentor confirms a session request. */
export interface MentorSessionConfirmedPayload {
  sessionId: string;
  mentorId: string;
  teacherId: string;
  scheduledAt: string;
}

export type MentorSessionConfirmedEvent = DomainEvent<MentorSessionConfirmedPayload>;

/** Emitted when a mentor declines a session request. */
export interface MentorSessionDeclinedPayload {
  sessionId: string;
  mentorId: string;
  teacherId: string;
}

export type MentorSessionDeclinedEvent = DomainEvent<MentorSessionDeclinedPayload>;

/** Emitted when a session is marked as completed. */
export interface MentorSessionCompletedPayload {
  sessionId: string;
  mentorId: string;
  teacherId: string;
  durationMinutes: number;
  trainingExecutionId?: string;
}

export type MentorSessionCompletedEvent = DomainEvent<MentorSessionCompletedPayload>;

/** Emitted when a session is cancelled by either party. */
export interface MentorSessionCancelledPayload {
  sessionId: string;
  mentorId: string;
  teacherId: string;
}

export type MentorSessionCancelledEvent = DomainEvent<MentorSessionCancelledPayload>;
