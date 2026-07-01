/**
 * Intelligence Freshness — Types
 *
 * Stable lifecycle model for intelligence snapshot freshness.
 * Reusable across CRI / Match / Gap / Recommendation / Verified State.
 *
 * Step 9A — Freshness Policy Contracts
 */

// ── Freshness Status ───────────────────────────────────────────

/**
 * Lifecycle status of an intelligence snapshot.
 *
 * - missing:       no snapshot has ever been computed
 * - fresh:         snapshot exists and no known invalidation since computation
 * - stale:         snapshot exists but may no longer reflect latest source signals
 * - invalidated:   snapshot is explicitly known to require refresh due to source change
 * - recomputing:   refresh has been requested/started but new snapshot not yet finalized
 * - failed:        recompute attempt failed; current data may be outdated or absent
 */
export type FreshnessStatus =
  | "missing"
  | "fresh"
  | "stale"
  | "invalidated"
  | "recomputing"
  | "failed";

// ── Freshness Metadata ─────────────────────────────────────────

/**
 * Machine-readable metadata describing the freshness lifecycle of a snapshot.
 * Used by both writers (to persist) and the consumption layer (to classify).
 *
 * No presentation copy. Pure data.
 */
export interface FreshnessMetadata {
  /** Current lifecycle status */
  status: FreshnessStatus;

  /** ISO timestamp of the current/latest successful computation */
  computedAt: string | null;

  /** ISO timestamp when the snapshot was explicitly invalidated */
  invalidatedAt: string | null;

  /** Machine-readable codes explaining why the snapshot became stale */
  staleReasonCodes: string[];

  /**
   * Hints about when upstream source data was last modified.
   * Keyed by source domain (e.g. "profile", "certifications", "job").
   * Writers can compare these against computedAt to detect staleness.
   */
  sourceUpdatedAtHints: Record<string, string>;

  /** ISO timestamp when a recompute was last requested */
  recomputeRequestedAt: string | null;

  /** Whether a recompute is currently in progress */
  recomputeInProgress: boolean;

  /** ISO timestamp of the last successful computation (may differ from computedAt during recompute) */
  lastSuccessfulComputationAt: string | null;

  /** ISO timestamp of the last failed computation attempt */
  lastFailureAt: string | null;

  /** Optional failure reason code from the last failed attempt */
  lastFailureReason: string | null;
}

// ── Snapshot Type Discriminator ────────────────────────────────

/**
 * The intelligence snapshot types that freshness policy applies to.
 */
export type IntelligenceSnapshotType =
  | "cri"
  | "match"
  | "gap"
  | "recommendation"
  | "verified_state";

// ── Stale Reason Codes ─────────────────────────────────────────

/**
 * Well-known reason codes for why a snapshot became stale or invalidated.
 * Extensible — consumers may define additional codes.
 */
export const STALE_REASON = {
  /** Teacher profile fields changed */
  PROFILE_UPDATED: "profile_updated",
  /** Teacher certifications/credentials changed */
  CREDENTIALS_UPDATED: "credentials_updated",
  /** Teacher skills changed */
  SKILLS_UPDATED: "skills_updated",
  /** Teacher languages changed */
  LANGUAGES_UPDATED: "languages_updated",
  /** Job requirements changed */
  JOB_UPDATED: "job_updated",
  /** Time-based expiry threshold exceeded */
  TIME_EXPIRED: "time_expired",
  /** Engine version upgraded since last computation */
  ENGINE_VERSION_CHANGED: "engine_version_changed",
  /** Upstream dependency snapshot was invalidated */
  DEPENDENCY_INVALIDATED: "dependency_invalidated",
  /** Manual invalidation by admin or system */
  MANUAL_INVALIDATION: "manual_invalidation",
} as const;

export type StaleReasonCode = (typeof STALE_REASON)[keyof typeof STALE_REASON];

// ── Freshness Policy Config ────────────────────────────────────

/**
 * Per-snapshot-type freshness thresholds.
 * Allows different snapshot types to have different staleness windows.
 */
export interface FreshnessPolicyConfig {
  /** Snapshot type this config applies to */
  snapshotType: IntelligenceSnapshotType;
  /** Duration in milliseconds after which a fresh snapshot becomes stale */
  freshnessTtlMs: number;
  /** Duration in milliseconds after which a stale snapshot is considered expired */
  expiryTtlMs: number;
}
