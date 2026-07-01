/**
 * Intelligence Consumption Layer — Types
 *
 * Stable result wrappers for UI consumption of intelligence snapshots.
 * These types decouple UI components from raw read-model internals.
 *
 * No scoring logic. No computation. Pure data shapes.
 *
 * Steps 8A + 9D — Consumption Contracts + Freshness Integration
 */

// ── Consumption Status ─────────────────────────────────────────

/**
 * Status of an intelligence snapshot from the consumer's perspective.
 *
 * - ready:   snapshot exists and is fresh
 * - stale:   snapshot exists but may be outdated (includes invalidated/recomputing)
 * - empty:   no snapshot has been computed yet
 * - loading: snapshot is being fetched (for async UI use)
 * - error:   fetch or mapping failed
 */
export type ConsumptionStatus = "ready" | "stale" | "empty" | "loading" | "error";

// ── Consumption Metadata ───────────────────────────────────────

export interface ConsumptionMeta {
  /** ISO timestamp of the last computation */
  computedAt: string | null;
  /** Freshness classification */
  freshnessStatus: "fresh" | "stale" | "expired" | "unknown";
  /** Whether the data should be considered outdated */
  isStale: boolean;
  /** Whether the snapshot has been explicitly invalidated (stronger than stale) */
  isInvalidated: boolean;
  /** Whether a recompute is currently in progress */
  isRecomputing: boolean;
  /** Why data is missing, if applicable */
  missingReason?: "never_computed" | "fetch_failed" | "teacher_not_found" | null;
  /** The event that triggered the last computation */
  triggeredByEvent?: string | null;
  /** Engine version that produced the snapshot */
  engineVersion?: string | null;
  /** ISO timestamp of the last successful computation */
  lastSuccessfulComputationAt?: string | null;
  /** ISO timestamp of the last failed computation attempt */
  lastFailureAt?: string | null;
}

// ── Generic Consumption Result ─────────────────────────────────

/**
 * Generic wrapper for any intelligence snapshot consumed by UI.
 * All intelligence data flows to UI through this shape.
 */
export interface ConsumptionResult<T> {
  /** Current status of the snapshot */
  status: ConsumptionStatus;
  /** The snapshot data (null when empty, loading, or error) */
  data: T | null;
  /** Metadata about freshness and provenance */
  metadata: ConsumptionMeta;
  /** Error message if status is "error" */
  error?: string | null;
}

// ── Domain-specific consumption types ──────────────────────────

/** CRI snapshot as consumed by UI */
export interface CriConsumptionData {
  score: number;
  band: string;
  dimensions: { dimension: string; label: string; score: number; maxScore: number; met: boolean }[];
  gapTermIds: string[];
  jobId: string;
}

/** Match snapshot as consumed by UI */
export interface MatchConsumptionData {
  score: number;
  confidence: "low" | "medium" | "high";
  dimensions: { dimension: string; label: string; score: number; maxScore: number; matched: boolean; reason: string }[];
  matchedTermIds: string[];
  unmatchedTermIds: string[];
  jobId: string;
}

/** Gap snapshot as consumed by UI */
export interface GapConsumptionData {
  gaps: {
    gapId: string;
    gapType: string;
    label: string;
    severity: string;
    confidence: string;
    category: string;
    taxonomyTermId?: string;
    evidenceSources: string[];
  }[];
  totalGaps: number;
  priorityGapIds: string[];
  groupedSummary: { category: string; count: number; highestSeverity: string }[];
  jobId?: string | null;
}

/** Recommendation snapshot as consumed by UI */
export interface RecommendationConsumptionData {
  recommendations: {
    recommendationId: string;
    type: string;
    targetId?: string;
    priority: string;
    confidence: string;
    reasonCodes: string[];
    relatedGapIds: string[];
    groupKey: string;
    actionLabelKey: string;
  }[];
  topRecommendationIds: string[];
  totalCount: number;
  groupedSummary: { groupKey: string; label: string; count: number; highestPriority: string }[];
}

/** Verified state snapshot as consumed by UI */
export interface VerifiedStateConsumptionData {
  overallStatus: "none" | "partial" | "full";
  credentials: {
    termId: string;
    credentialType: string;
    verified: boolean;
    verifiedAt?: string | null;
  }[];
  verifiedCount: number;
  totalCount: number;
}

// ── Typed consumption results ──────────────────────────────────

export type CriConsumptionResult = ConsumptionResult<CriConsumptionData>;
export type MatchConsumptionResult = ConsumptionResult<MatchConsumptionData>;
export type GapConsumptionResult = ConsumptionResult<GapConsumptionData>;
export type RecommendationConsumptionResult = ConsumptionResult<RecommendationConsumptionData>;
export type VerifiedStateConsumptionResult = ConsumptionResult<VerifiedStateConsumptionData>;
