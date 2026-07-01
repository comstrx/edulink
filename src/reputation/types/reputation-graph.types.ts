/**
 * Professional Reputation Graph Layer — Types
 *
 * Defines the enhanced reputation model that aggregates verified signals
 * across Trust, Training, Mentoring, and Hiring domains into an
 * explainable, audience-aware reputation structure.
 *
 * No persistent storage — all data derived from existing domain tables.
 */

// ── Reputation Levels (transparent, rule-based) ──

export type ReputationGraphLevel =
  | "emerging"
  | "developing"
  | "established"
  | "strong"
  | "trusted";

export const REPUTATION_GRAPH_LEVEL_LABELS: Record<ReputationGraphLevel, string> = {
  emerging: "Emerging",
  developing: "Developing",
  established: "Established",
  strong: "Strong",
  trusted: "Trusted",
};

export const REPUTATION_GRAPH_LEVEL_COLORS: Record<ReputationGraphLevel, string> = {
  emerging: "bg-muted text-muted-foreground",
  developing: "bg-accent/20 text-accent-foreground",
  established: "bg-primary/10 text-primary",
  strong: "bg-primary/20 text-primary",
  trusted: "bg-primary text-primary-foreground",
};

// ── Evidence Source (explainability) ──

export type EvidenceSourceKind =
  | "trust_verification"
  | "training_completion"
  | "earned_credential"
  | "pathway_completion"
  | "mentor_session"
  | "mentor_validation"
  | "mentor_review_rating"
  | "hiring_shortlisted"
  | "hiring_interviewed"
  | "hiring_placed";

export interface EvidenceSource {
  kind: EvidenceSourceKind;
  label: string;
  count: number;
}

// ── Signal Categories ──

export interface TrustSignals {
  verifiedIdentity: boolean;
  verifiedCredentials: boolean;
  verificationCount: number;
  trustLevel: "none" | "basic" | "enhanced" | "full";
}

export interface TrainingEvidenceSignals {
  completedCourses: number;
  verifiedCompletions: number;
  earnedBadges: number;
  earnedCertificates: number;
  completedPathways: number;
}

export interface MentoringSignals {
  completedSessions: number;
  approvedEvidence: number;
  mentorReviewCount: number;
  averageMentorRating: number | null;
  mentorValidationCount: number;
}

export interface HiringOutcomeSignals {
  shortlistedCount: number;
  interviewedCount: number;
  hiredCount: number;
}

export interface ReviewSignals {
  reviewScore: number | null;
  reviewCount: number;
}

// ── Audience Boundaries ──

export type ReputationAudience = "public" | "school" | "internal";

/** Public-safe: only verified credentials, training completions, level */
export interface PublicReputationView {
  reputationLevel: ReputationGraphLevel;
  verifiedCredentials: number;
  completedTrainings: number;
  completedPathways: number;
}

/** School-visible: adds mentoring + career readiness */
export interface SchoolReputationView extends PublicReputationView {
  mentorValidationCount: number;
  averageMentorRating: number | null;
  trustLevel: TrustSignals["trustLevel"];
  completedSessions: number;
}

/** Internal: full detail (never exposed publicly) */
export interface InternalReputationView extends SchoolReputationView {
  hiringOutcomes: HiringOutcomeSignals;
  reviewSignals: ReviewSignals;
  evidenceSources: EvidenceSource[];
  reputationScore: number;
}

// ── Full Reputation Graph Summary ──

export type ReputationGraphResolvedState = "loading" | "unavailable" | "resolved";

export interface ReputationGraphSummary {
  resolvedState: ReputationGraphResolvedState;

  /** Normalized 0–100 score (internal use) */
  reputationScore: number;

  /** Transparent, rule-based level */
  reputationLevel: ReputationGraphLevel;

  /** Signal categories */
  trust: TrustSignals;
  training: TrainingEvidenceSignals;
  mentoring: MentoringSignals;
  hiring: HiringOutcomeSignals;
  reviews: ReviewSignals;

  /** Explainability: which evidence contributed */
  evidenceSources: EvidenceSource[];

  /** Experience from identity domain */
  experienceYears: number | null;

  /** Backward compat fields (mapped from Sprint 8B) */
  verifiedCredentials: number;
  reviewScore: number | null;
  reviewCount: number;
  completedTrainingCount: number;
  trustLevel: TrustSignals["trustLevel"];
}

// ── Hiring-consumable signals ──

export interface ReputationHiringSignals {
  credentialEvidence: number;
  trainingEvidence: number;
  mentorValidation: number;
  placementEvidence: number;
  reputationLevel: ReputationGraphLevel;
}
