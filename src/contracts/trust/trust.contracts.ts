import type { DomainEvent } from "../core/domain-event";

/**
 * Trust Domain Contracts
 *
 * Covers credential issuance and verification lifecycle.
 *
 * Phase 1 — Smart Domain Contracts Foundation
 */

/** Emitted when a credential is issued. Producer: Trust → Consumers: Hiring, Intelligence */
export interface CredentialIssuedPayload {
  teacherId: string;
  credentialId: string;
  sourceType: "training" | "manual" | "verification";
  evidenceType: string;
  issuedAt: string;
}

export type CredentialIssuedEvent = DomainEvent<CredentialIssuedPayload>;

/** Verification finished. Producer: Trust → Consumers: Hiring, Identity */
export interface VerificationCompletedPayload {
  teacherId: string;
  verificationType: string;
  status: "approved" | "rejected" | "pending";
  completedAt: string;
}

export type VerificationCompletedEvent = DomainEvent<VerificationCompletedPayload>;

/* ── Aliases for event-map compatibility ────── */

export interface CredentialValidatedPayload extends CredentialIssuedPayload {}

export interface VerificationRequestedPayload {
  userId: string;
  profileId: string;
  verificationType: "identity" | "credential" | "employment";
}

export interface BackgroundCheckPassedPayload {
  userId: string;
  profileId: string;
  checkProvider?: string;
  passedAt: string;
}
