/**
 * CRI Engine v1 — Rules & Thresholds
 *
 * Centralized constants for component weights, band thresholds,
 * scoring caps, and utility helpers used by the CRI engine.
 *
 * Phase 4C — Live scoring rules
 */

import type { CriBand } from "./cri-engine.types";

// ── Component Weights (must sum to 100) ────────────────────────

export const CRI_COMPONENT_WEIGHTS = {
  profile: 35,
  training: 25,
  verification: 25,
  hiring_signals: 15,
} as const satisfies Record<string, number>;

// ── Band Thresholds ────────────────────────────────────────────

/** Ordered from highest to lowest — first match wins */
export const CRI_BAND_THRESHOLDS: { minScore: number; band: CriBand }[] = [
  { minScore: 80, band: "highly_ready" },
  { minScore: 60, band: "strong" },
  { minScore: 40, band: "emerging" },
  { minScore: 0, band: "not_ready" },
];

// ── Profile Scoring Constants ──────────────────────────────────

/** Points awarded per boolean profile signal */
export const PROFILE_SIGNAL_POINTS: Record<string, number> = {
  hasHeadline: 10,
  hasBio: 15,
  hasSubjectMappings: 15,
  hasCurriculumMappings: 10,
  hasExperienceEntries: 15,
  hasEducationEntries: 15,
  hasLanguageEntries: 10,
};
// Remaining 10 points come from profileCompletenessScore bonus

// ── Training Scoring Constants ─────────────────────────────────

/** Course count thresholds for scoring tiers */
export const TRAINING_COURSE_TIERS = [
  { minCourses: 10, score: 100 },
  { minCourses: 7, score: 85 },
  { minCourses: 5, score: 70 },
  { minCourses: 3, score: 55 },
  { minCourses: 1, score: 35 },
  { minCourses: 0, score: 0 },
] as const;

/** Bonus for recent training activity (max 15 points) */
export const TRAINING_RECENCY_BONUS = 15;

// ── v2 Training Growth Constants ───────────────────────────────

/** Verified completion multiplier (1.5x vs regular completion) */
export const VERIFIED_COMPLETION_MULTIPLIER = 1.5;

/** Max CRI boost from catalog cri_boost_value accumulation */
export const CRI_BOOST_CAP = 20;

/** Points per approved evidence artifact (max 10) */
export const APPROVED_EVIDENCE_BONUS_PER = 3;
export const APPROVED_EVIDENCE_CAP = 10;

/** Points per mentor-validated review (max 10) */
export const MENTOR_APPROVAL_BONUS_PER = 4;
export const MENTOR_APPROVAL_CAP = 10;

/** Active pathway progress bonus (up to 5 points scaled) */
export const ACTIVE_PATHWAY_PROGRESS_CAP = 5;

/** Earned credential bonus per credential (max 10) */
export const EARNED_CREDENTIAL_BONUS_PER = 5;
export const EARNED_CREDENTIAL_CAP = 10;

// ── Verification Scoring Constants ─────────────────────────────

export const VERIFICATION_SIGNAL_POINTS: Record<string, number> = {
  identityVerified: 30,
  educationVerified: 25,
  experienceVerified: 20,
  credentialVerified: 25,
};

// ── Hiring Scoring Constants ───────────────────────────────────

/** Soft baseline for teachers with no hiring history */
export const HIRING_NO_HISTORY_BASELINE = 50;

/** Per-signal bonus caps */
export const HIRING_SHORTLIST_BONUS_PER = 8;
export const HIRING_SHORTLIST_CAP = 24;
export const HIRING_INTERVIEW_BONUS_PER = 10;
export const HIRING_INTERVIEW_CAP = 20;
export const HIRING_APPLICATION_BONUS_PER = 2;
export const HIRING_APPLICATION_CAP = 10;
/** Rejection penalty is soft — max 15 points */
export const HIRING_REJECTION_PENALTY_PER = 3;
export const HIRING_REJECTION_PENALTY_CAP = 15;

// ── Helpers ────────────────────────────────────────────────────

/**
 * Resolve a 0–100 score into its CRI band.
 */
export function resolveBand(score: number): CriBand {
  for (const entry of CRI_BAND_THRESHOLDS) {
    if (score >= entry.minScore) return entry.band;
  }
  return "not_ready";
}

/**
 * Clamp a numeric value to 0–max range.
 */
export function clampScore(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}
