/**
 * Intelligence Exposure Layer — Types
 *
 * Defines audiences, exposure rules, and audience-scoped DTOs
 * that control what intelligence data is visible to each consumer.
 *
 * Phase 4A — Intelligence Governance
 */

// ── Audiences ──────────────────────────────────────────────────

/**
 * The audience consuming intelligence data.
 * Each audience sees a controlled subset of intelligence outputs.
 */
export type ExposureAudience = "teacher" | "school" | "public" | "admin";

// ── Exposure Level ─────────────────────────────────────────────

/**
 * How much detail is exposed for a given intelligence output.
 *
 * - full:    all fields, all breakdowns
 * - summary: aggregated view (e.g. banded score, count only)
 * - badge:   minimal indicator (e.g. verified/not verified)
 * - hidden:  not exposed at all
 */
export type ExposureLevel = "full" | "summary" | "badge" | "hidden";

// ── Per-output exposure DTOs ───────────────────────────────────

/** CRI exposed at "full" level (teacher self-view) */
export interface CriExposedFull {
  level: "full";
  score: number;
  band: string;
  dimensions: { dimension: string; label: string; score: number; maxScore: number; met: boolean }[];
  gapTermIds: string[];
}

/** CRI exposed at "summary" level (school view — banded only) */
export interface CriExposedSummary {
  level: "summary";
  band: string;
  /** Score rounded to nearest 10 to prevent exact reverse-engineering */
  scoreBand: string;
}

/** Match exposed at "full" level (school hiring view) */
export interface MatchExposedFull {
  level: "full";
  score: number;
  confidence: "low" | "medium" | "high";
  dimensions: { dimension: string; label: string; score: number; maxScore: number; matched: boolean; reason: string }[];
}

/** Match exposed at "summary" level (teacher self-view — strengths + gaps only) */
export interface MatchExposedSummary {
  level: "summary";
  score: number;
  strengths: string[];
  gaps: string[];
}

/** Gap exposed at "full" level (teacher self-view) */
export interface GapExposedFull {
  level: "full";
  totalGaps: number;
  gaps: { gapId: string; label: string; category: string; severity: string }[];
  groupedSummary: { category: string; count: number }[];
}

/** Gap exposed at "summary" level (school — applied candidates only) */
export interface GapExposedSummary {
  level: "summary";
  totalGaps: number;
  groupedSummary: { category: string; count: number }[];
}

/** Recommendation exposed at "full" level (teacher only) */
export interface RecommendationExposedFull {
  level: "full";
  totalCount: number;
  recommendations: {
    recommendationId: string;
    type: string;
    priority: string;
    actionLabelKey: string;
    reasonCodes: string[];
    relatedGapIds: string[];
  }[];
}

/** Recommendation exposed at "summary" level (school — aggregate only) */
export interface RecommendationExposedSummary {
  level: "summary";
  totalCount: number;
  groupedAreas: { area: string; count: number }[];
}

/** Verification exposed at "full" level (teacher self-view) */
export interface VerificationExposedFull {
  level: "full";
  overallStatus: "none" | "partial" | "full";
  verifiedCount: number;
  totalCount: number;
  credentials: { termId: string; credentialType: string; verified: boolean; verifiedAt?: string | null }[];
}

/** Verification exposed at "badge" level (school/public) */
export interface VerificationExposedBadge {
  level: "badge";
  overallStatus: "none" | "partial" | "full";
}

// ── Hidden sentinel ────────────────────────────────────────────

export interface ExposedHidden {
  level: "hidden";
}

// ── Rejection exposure DTOs ────────────────────────────────────

/** Rejection exposed at "full" level (school — raw reason) */
export interface RejectionExposedSchool {
  level: "full";
  rejectionReasonLabel: string;
  rejectionNotes: string | null;
}

/** Rejection exposed at "summary" level (teacher — improvement hint only) */
export interface RejectionExposedTeacher {
  level: "summary";
  improvementHint: string;
}

// ── Union types per output ─────────────────────────────────────

export type CriExposed = CriExposedFull | CriExposedSummary | ExposedHidden;
export type MatchExposed = MatchExposedFull | MatchExposedSummary | ExposedHidden;
export type GapExposed = GapExposedFull | GapExposedSummary | ExposedHidden;
export type RecommendationExposed = RecommendationExposedFull | RecommendationExposedSummary | ExposedHidden;
export type VerificationExposed = VerificationExposedFull | VerificationExposedBadge | ExposedHidden;
export type RejectionExposed = RejectionExposedSchool | RejectionExposedTeacher | ExposedHidden;
