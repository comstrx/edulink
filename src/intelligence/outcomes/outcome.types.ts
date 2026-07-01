/**
 * Outcome Learning Types — Sprint 15
 *
 * Defines outcome signal shapes used by the feedback overlay.
 * All outcome data is derived from existing intelligence snapshots —
 * no new schema, no ML, no stored raw data.
 */

/** Classification of an outcome's measured impact */
export type OutcomeImpact = "positive" | "neutral" | "negative";

/** A single outcome observation from comparing before/after intelligence */
export interface OutcomeSignal {
  teacherId: string;
  /** What triggered the outcome */
  sourceEvent: string;
  /** What the outcome relates to */
  outcomeType: OutcomeType;
  /** Measured impact */
  impact: OutcomeImpact;
  /** Numeric delta (e.g. gap count change, CRI delta) */
  delta: number;
  /** Timestamp */
  observedAt: string;
  /** Trace for debugging */
  reasoning: string;
}

export type OutcomeType =
  | "recommendation_followed"   // user completed a recommended course
  | "gap_closure"               // training closed a gap
  | "cri_improvement"           // CRI increased after action
  | "trust_improvement"         // trust/verified state improved
  | "readiness_improvement"     // readiness level went up
  | "repeat_application";       // user re-applied after improvement

/** Aggregated feedback state for a teacher (derived, never stored) */
export interface TeacherOutcomeFeedback {
  teacherId: string;
  /** How many recommendations were followed and succeeded */
  successfulRecommendations: number;
  /** Ratio of followed recs vs total active recs (0–1) */
  recommendationSuccessRate: number;
  /** How many training completions closed gaps (0–1) */
  gapClosureRate: number;
  /** Effectiveness of gap closure relative to training volume (0–100) */
  gapClosureEffectiveness: number;
  /** Whether CRI is trending up */
  criTrending: "up" | "stable" | "down";
  /** Whether readiness is improving */
  readinessImproving: boolean;
  /** Weighted provider outcome score across completed training (0–100) */
  providerOutcomeScore: number;
  /** Score measuring improvement after rejection events (0–100) */
  improvementAfterRejectionScore: number;
  /** Overall learner effectiveness band */
  learnerBand: "effective" | "steady" | "struggling";
}
