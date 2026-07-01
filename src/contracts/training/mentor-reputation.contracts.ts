/**
 * Mentor Session Review Domain Contracts — Sprint B2-C
 */
import type { DomainEvent } from "../core/domain-event";

/** Emitted when a teacher submits a session review. */
export interface MentorReviewSubmittedPayload {
  reviewId: string;
  mentorId: string;
  sessionId: string;
  reviewerUserId: string;
  rating: number;
}

export type MentorReviewSubmittedEvent = DomainEvent<MentorReviewSubmittedPayload>;

/** Emitted when an admin approves a session review. */
export interface MentorSessionReviewApprovedPayload {
  reviewId: string;
  mentorId: string;
  sessionId: string;
  rating: number;
}

export type MentorSessionReviewApprovedEvent = DomainEvent<MentorSessionReviewApprovedPayload>;

/** Emitted when an admin rejects a session review. */
export interface MentorSessionReviewRejectedPayload {
  reviewId: string;
  mentorId: string;
  sessionId: string;
}

export type MentorSessionReviewRejectedEvent = DomainEvent<MentorSessionReviewRejectedPayload>;

/** Emitted when a mentor's aggregate rating changes. */
export interface MentorRatingUpdatedPayload {
  mentorId: string;
  averageRating: number;
  reviewCount: number;
}

export type MentorRatingUpdatedEvent = DomainEvent<MentorRatingUpdatedPayload>;
