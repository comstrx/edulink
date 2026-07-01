/**
 * Professional Reputation — Unified Public Types
 * Sprint 8B
 *
 * These types define the normalized reputation summary consumed
 * by all public and app surfaces. No consumer should compute
 * reputation independently.
 */

export type ReputationLevel = "bronze" | "silver" | "gold" | "verified";

export type ReputationResolvedState = "loading" | "unavailable" | "resolved";

/**
 * Deterministic rules for deriving reputation level from score.
 * Score range: 0–100.
 */
export const REPUTATION_LEVEL_THRESHOLDS: { min: number; level: ReputationLevel }[] = [
  { min: 75, level: "verified" },
  { min: 50, level: "gold" },
  { min: 25, level: "silver" },
  { min: 0, level: "bronze" },
];

export function deriveReputationLevel(score: number): ReputationLevel {
  for (const t of REPUTATION_LEVEL_THRESHOLDS) {
    if (score >= t.min) return t.level;
  }
  return "bronze";
}

export const REPUTATION_LEVEL_LABELS: Record<ReputationLevel, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  verified: "Verified",
};

export const REPUTATION_LEVEL_COLORS: Record<ReputationLevel, string> = {
  bronze: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  silver: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  verified: "bg-primary/10 text-primary",
};

/**
 * Unified professional reputation summary.
 * Consumed by: ReputationCard, ReputationBadge, CandidatePanel, directory cards.
 */
export interface ProfessionalReputationSummary {
  resolvedState: ReputationResolvedState;
  /** Normalized 0–100 score */
  reputationScore: number;
  /** Deterministic level derived from score */
  reputationLevel: ReputationLevel;
  /** Count of active earned credentials */
  verifiedCredentials: number;
  /** Average review score (1–5), null if no reviews */
  reviewScore: number | null;
  /** Total approved reviews */
  reviewCount: number;
  /** Years of experience from teacher profile */
  experienceYears: number | null;
  /** Count of verified training completions */
  completedTrainingCount: number;
  /** Trust level from account verifications */
  trustLevel: "none" | "basic" | "enhanced" | "full";
}
