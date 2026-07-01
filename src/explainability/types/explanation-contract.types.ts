/**
 * Explainability / Confidence Layer — Core Types
 *
 * Normalized explanation contract consumed by all UI surfaces.
 * No persistent storage. Read-only derivation from existing signals.
 */

// ── Evidence Status ──

export type EvidenceStatus = "verified" | "derived" | "missing" | "private";

// ── Confidence Level ──

export type ConfidenceLevel = "low" | "medium" | "high";

// ── Audience ──

export type ExplanationAudience = "public" | "school" | "internal";

// ── Source Domains ──

export type SourceDomain =
  | "identity"
  | "trust"
  | "training"
  | "reputation"
  | "mentoring"
  | "hiring"
  | "growth"
  | "visibility";

// ── Signal Type ──

export type SignalType =
  | "skill"
  | "credential"
  | "training_completion"
  | "training_enrollment"
  | "pathway_completion"
  | "verification"
  | "mentor_session"
  | "mentor_review"
  | "mentor_validation"
  | "school_feedback"
  | "hiring_outcome"
  | "reputation_level"
  | "readiness_level"
  | "visibility_setting"
  | "provider_status"
  | "catalog_eligibility"
  | "experience";

// ── Explanation Reason ──

export interface ExplanationReason {
  label: string;
  sourceDomain: SourceDomain;
  signalType: SignalType;
  evidenceStatus: EvidenceStatus;
  /** Which audiences can see this reason */
  visibility: ExplanationAudience[];

  // ── Optional traceable metadata ──

  /** Numeric count of the underlying signal (e.g. 5 credentials) */
  signalCount?: number;
  /** What the verification is based on (e.g. "account_verifications") */
  verificationBasis?: string;
  /** Whether this is a primary/core signal for the explanation context */
  isPrimary?: boolean;
}

// ── Missing Signal ──

export interface MissingSignal {
  label: string;
  sourceDomain: SourceDomain;
  signalType: SignalType;
  /** Actionable hint for the user */
  hint?: string;
  /** Which audiences can see this missing signal */
  visibility: ExplanationAudience[];
}

// ── Explanation Status ──

export type ExplanationStatus = "ready" | "loading" | "unavailable";

// ── Explanation Context ──
//
// teacher_fit = general professional suitability signal.
// It represents whether a teacher has the professional evidence to be
// considered for opportunities. It is NOT job-specific fit and must NOT
// behave like a hiring ranking engine. Teacher fit references skills,
// credentials, training, reputation, and trust — but does not rank
// candidates against each other or against specific job requirements.

export type ExplanationContext =
  | "teacher_fit"
  | "mentor_trust"
  | "provider_visibility"
  | "career_readiness";

// ── Normalized Explanation Contract ──

export interface ExplanationContract {
  status: ExplanationStatus;
  context: ExplanationContext;
  confidenceLevel: ConfidenceLevel;
  /** One-line human-readable summary */
  summary: string;
  /** Contributing signals */
  reasons: ExplanationReason[];
  /** Signals that could strengthen the explanation */
  missingSignals: MissingSignal[];
  /** Audience this explanation was filtered for */
  audience: ExplanationAudience;
}

// ── Empty fallback ──

export const EMPTY_EXPLANATION: ExplanationContract = {
  status: "unavailable",
  context: "career_readiness",
  confidenceLevel: "low",
  summary: "Insufficient data to generate explanation.",
  reasons: [],
  missingSignals: [],
  audience: "public",
};
