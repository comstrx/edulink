/**
 * Intelligence Read Models — Typed Contracts
 *
 * Stable snapshot shapes for Intelligence domain outputs.
 * These are OUTPUT contracts — they describe what consumers receive,
 * not how values are computed.
 *
 * No scoring logic. No recommendation logic. No formulas.
 *
 * Workstream 2A — Intelligence Read Models Architecture
 */

// ── Shared Metadata ────────────────────────────────────────────

export type SnapshotStaleness = "fresh" | "stale" | "expired";

/** Common metadata present on every read-model snapshot. */
export interface SnapshotMeta {
  /** ISO timestamp of the last computation */
  computedAt: string;
  /** Freshness classification (determined by consumer or cache layer) */
  staleness?: SnapshotStaleness;
  /** Optional TTL hint in seconds for cache layers */
  ttlSeconds?: number;
  /** Version of the computation engine that produced this snapshot */
  engineVersion?: string;
}

// ── 1. TeacherCriSnapshot ──────────────────────────────────────

/** Career Readiness Index snapshot for a teacher × job pair. */
export interface TeacherCriSnapshot {
  /** Teacher profile ID */
  teacherId: string;
  /** Job ID this CRI was computed against */
  jobId: string;
  /** Overall CRI score (0–100) */
  score: number;
  /** Per-dimension breakdown */
  dimensions: CriDimensionScore[];
  /** Unmatched requirement term IDs (gaps) */
  gapTermIds: string[];
  /** Snapshot metadata */
  meta: SnapshotMeta;
}

export interface CriDimensionScore {
  /** Dimension key (e.g. "subjects", "location") */
  dimension: string;
  /** Dimension label for display */
  label: string;
  /** Score earned for this dimension */
  score: number;
  /** Maximum possible score for this dimension */
  maxScore: number;
  /** Whether the dimension is considered matched */
  matched: boolean;
}

// ── 2. TeacherJobMatchSnapshot ─────────────────────────────────

/** Match score snapshot for a teacher × job pair (school-facing). */
export interface TeacherJobMatchSnapshot {
  /** Teacher profile ID */
  teacherId: string;
  /** Job ID */
  jobId: string;
  /** Overall match score (0–100) */
  score: number;
  /** Confidence level of the match */
  confidence: "low" | "medium" | "high";
  /** Per-dimension breakdown */
  dimensions: MatchDimensionScore[];
  /** Term IDs that matched */
  matchedTermIds: string[];
  /** Term IDs that did not match */
  unmatchedTermIds: string[];
  /** Snapshot metadata */
  meta: SnapshotMeta;
}

export interface MatchDimensionScore {
  /** Dimension key */
  dimension: string;
  /** Display label */
  label: string;
  /** Score earned */
  score: number;
  /** Max score for this dimension */
  maxScore: number;
  /** Whether the dimension matched */
  matched: boolean;
  /** Human-readable reason */
  reason: string;
}

// ── 3. TeacherGapSnapshot ──────────────────────────────────────

/** Aggregated skill/qualification gaps for a teacher. */
export interface TeacherGapSnapshot {
  /** Teacher profile ID */
  teacherId: string;
  /** Optional: scoped to a specific job */
  jobId?: string | null;
  /** Individual gap entries */
  gaps: GapEntry[];
  /** Total number of identified gaps */
  totalGaps: number;
  /** Snapshot metadata */
  meta: SnapshotMeta;
}

export interface GapEntry {
  /** Taxonomy term ID of the missing requirement */
  termId: string;
  /** Human-readable label of the gap */
  label?: string;
  /** Category of gap */
  category: "subject" | "curriculum" | "certification" | "language" | "skill" | "experience" | "location" | "other";
  /** Source that identified this gap */
  source: "job_requirement" | "assessment" | "profile_analysis";
  /** Severity as computed by the gap engine */
  severity: "critical" | "high" | "medium" | "low";
  /** Confidence as computed by the gap engine */
  confidence?: "high" | "medium" | "low";
  /** Optional: job ID that surfaced this gap */
  sourceJobId?: string | null;
}

// ── 4. TeacherRecommendationsSnapshot ──────────────────────────

/** Recommended items for a teacher. */
export interface TeacherRecommendationsSnapshot {
  /** Teacher profile ID */
  teacherId: string;
  /** Grouped recommendation entries */
  recommendations: RecommendationEntry[];
  /** Total count across all types */
  totalCount: number;
  /** Snapshot metadata */
  meta: SnapshotMeta;
}

export interface RecommendationEntry {
  /** Unique recommendation ID from the engine */
  recommendationId: string;
  /** Granular recommendation type from engine */
  recommendationType: string;
  /** Legacy coarse type (mapped from recommendationType) */
  type: "job" | "training" | "pathway" | "mentor";
  /** ID of the recommended item / target */
  itemId: string;
  /** Priority as computed by the engine */
  priority: "critical" | "high" | "medium" | "low";
  /** Confidence as computed by the engine */
  confidence: "high" | "medium" | "low";
  /** Human-readable reason for the recommendation */
  reason?: string;
  /** Reason codes from the engine */
  reasonCodes: string[];
  /** Display-ready action label key */
  actionLabelKey: string;
  /** Grouping key for UI sections */
  groupKey: string;
  /** Relevance rank (positional, 1 = first) */
  rank: number;
  /** Gap term IDs this recommendation addresses */
  addressesGapTermIds: string[];
  /** Related taxonomy term IDs */
  relatedTaxonomyTermIds: string[];
}

// ── 5. TeacherVerifiedStateSnapshot ────────────────────────────

/** Aggregated verification status for a teacher's credentials. */
export interface TeacherVerifiedStateSnapshot {
  /** Teacher profile ID */
  teacherId: string;
  /** Overall verification level */
  overallStatus: "none" | "partial" | "full";
  /** Per-credential verification entries */
  credentials: VerifiedCredentialEntry[];
  /** Count of verified credentials */
  verifiedCount: number;
  /** Count of total credentials */
  totalCount: number;
  /** Snapshot metadata */
  meta: SnapshotMeta;
}

export interface VerifiedCredentialEntry {
  /** Credential/certification term ID */
  termId: string;
  /** Type of credential */
  credentialType: "certification" | "license" | "degree" | "training";
  /** Whether this credential is verified */
  verified: boolean;
  /** ISO timestamp of verification (if verified) */
  verifiedAt?: string | null;
  /** Verification source */
  verifiedBy?: string | null;
}
