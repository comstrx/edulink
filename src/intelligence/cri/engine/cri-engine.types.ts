/**
 * CRI Engine v1 — Type Contracts
 *
 * Defines normalized input and output shapes for the Career Readiness Index engine.
 * These contracts decouple the engine from data-loading and persistence concerns.
 *
 * Phase 4A — Skeleton
 */

// ── CRI Band ───────────────────────────────────────────────────

/** Stable band classification for CRI scores */
export type CriBand = "not_ready" | "emerging" | "strong" | "highly_ready";

/** Human-readable labels keyed by band */
export const CRI_BAND_LABELS: Record<CriBand, string> = {
  not_ready: "Not Ready",
  emerging: "Emerging",
  strong: "Strong",
  highly_ready: "Highly Ready",
};

// ── Input Signals ──────────────────────────────────────────────

/** Profile-level signals derived from teacher_profiles + related tables */
export interface CriProfileSignals {
  hasHeadline: boolean;
  hasBio: boolean;
  hasSubjectMappings: boolean;
  hasCurriculumMappings: boolean;
  hasExperienceEntries: boolean;
  hasEducationEntries: boolean;
  hasLanguageEntries: boolean;
  /** Pre-computed 0–100 ratio of filled vs expected profile fields */
  profileCompletenessScore: number;
}

/** Training-level signals derived from runtime execution state (v2: actual growth signals) */
export interface CriTrainingSignals {
  completedCourseCount: number;
  completedPathwayCount?: number;
  recentCompletionCount?: number;
  relevantTrainingCount?: number;
  /** v2: Verified completions (mentor-approved evidence) carry more weight */
  verifiedCompletionCount?: number;
  /** v2: Accumulated cri_boost_value from completed training items */
  criBoostTotal?: number;
  /** v2: Number of approved evidence artifacts */
  approvedEvidenceCount?: number;
  /** v2: Number of mentor-validated reviews */
  mentorApprovedCount?: number;
  /** v2: Active pathway progress (0-100) for in-progress pathways */
  activePathwayProgressPercent?: number;
  /** v2: Number of earned credentials */
  earnedCredentialCount?: number;
}

/** Trust-level signals derived from credential verification state */
export interface CriTrustSignals {
  identityVerified: boolean;
  educationVerified: boolean;
  experienceVerified: boolean;
  credentialVerified: boolean;
  totalVerifiedCount: number;
}

/** Hiring-level signals derived from applications / pipeline data */
export interface CriHiringSignals {
  applicationsCount?: number;
  shortlistedCount?: number;
  rejectionsCount?: number;
  interviewsCount?: number;
}

/** Metadata about the computation trigger */
export interface CriComputeMetadata {
  computedForTeacherId: string;
  triggeredByEvent?: string;
  triggeredAt?: string;
  /** ISO timestamps of the latest source-table updates used to judge freshness */
  sourceUpdatedAtHints?: Record<string, string>;
}

// ── Engine Input ───────────────────────────────────────────────

/** Fully-normalized input contract for one CRI computation run */
export interface CriEngineInput {
  teacherId: string;
  profileSignals: CriProfileSignals;
  trainingSignals: CriTrainingSignals;
  trustSignals: CriTrustSignals;
  hiringSignals: CriHiringSignals;
  metadata: CriComputeMetadata;
}

// ── Engine Output ──────────────────────────────────────────────

/** Score for a single CRI component */
export interface CriComponentScore {
  component: "profile" | "training" | "verification" | "hiring_signals";
  label: string;
  score: number;
  maxScore: number;
  /** Whether this component meets the minimum acceptable threshold */
  met: boolean;
}

/** Machine-readable reason code explaining a score contributor or detractor */
export interface CriReasonCode {
  code: string;
  /** positive = boost, negative = gap */
  polarity: "positive" | "negative";
  message: string;
}

/** Freshness metadata attached to every CRI result */
export interface CriFreshness {
  isStale: boolean;
  freshnessStatus: "fresh" | "stale" | "expired";
}

/** Complete CRI engine output */
export interface CriEngineResult {
  teacherId: string;
  criScore: number;
  criBand: CriBand;
  breakdownSummary: string;
  componentScores: CriComponentScore[];
  reasonCodes: CriReasonCode[];
  computedAt: string;
  triggeredByEvent?: string;
  freshness: CriFreshness;
}
