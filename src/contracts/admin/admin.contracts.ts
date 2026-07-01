/**
 * Admin Domain Contracts — Sprint 13
 *
 * Canonical payloads for admin-authority actions that produce
 * intelligence-relevant signals.
 *
 * These actions affect downstream teacher trust, readiness, and visibility.
 */

import type { DomainEvent } from "../core/domain-event";

/**
 * Emitted when an admin approves a mentor session review.
 * Affects: mentor reputation, teacher trust signals.
 */
export interface AdminReviewApprovedPayload {
  reviewId: string;
  mentorId: string;
  sessionId: string;
  reviewerUserId: string;
  approvedAt: string;
}

export type AdminReviewApprovedEvent = DomainEvent<AdminReviewApprovedPayload>;

/**
 * Emitted when an admin rejects a mentor session review.
 * Affects: mentor reputation (negative signal).
 */
export interface AdminReviewRejectedPayload {
  reviewId: string;
  mentorId: string;
  sessionId: string;
  reviewerUserId: string;
  rejectedAt: string;
}

export type AdminReviewRejectedEvent = DomainEvent<AdminReviewRejectedPayload>;

/**
 * Emitted when an admin approves provider content (training item).
 * Affects: provider trust, content visibility.
 */
export interface AdminContentApprovedPayload {
  itemId: string;
  providerId: string;
  approvedBy: string;
  approvedAt: string;
}

export type AdminContentApprovedEvent = DomainEvent<AdminContentApprovedPayload>;

/**
 * Emitted when an admin rejects provider content.
 * Affects: provider trust, content not visible.
 */
export interface AdminContentRejectedPayload {
  itemId: string;
  providerId: string;
  rejectedBy: string;
  rejectedAt: string;
  reviewNotes?: string;
}

export type AdminContentRejectedEvent = DomainEvent<AdminContentRejectedPayload>;
