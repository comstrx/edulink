/**
 * Intelligence Invalidation Matrix
 *
 * Canonical policy mapping source-domain events to affected intelligence snapshots.
 * Encodes which snapshots need refresh when upstream data changes,
 * and at what invalidation strength.
 *
 * Step 9B — Invalidation Matrix
 */

import type { IntelligenceSnapshotType, StaleReasonCode } from "../types/freshness.types";
import { STALE_REASON } from "../types/freshness.types";

// ── Invalidation Strength ──────────────────────────────────────

/**
 * How urgently a snapshot should be recomputed after invalidation.
 *
 * - strong: source change directly affects the snapshot's core output;
 *           recompute should happen at earliest opportunity
 * - soft:   source change may indirectly affect the snapshot;
 *           recompute can be deferred or batched
 */
export type InvalidationStrength = "strong" | "soft";

// ── Invalidation Rule ──────────────────────────────────────────

/**
 * A single invalidation rule: one source event affecting one snapshot type.
 */
export interface InvalidationRule {
  /** The source event that triggers invalidation */
  sourceEvent: string;
  /** The snapshot type affected */
  snapshotType: IntelligenceSnapshotType;
  /** How urgently recompute is needed */
  strength: InvalidationStrength;
  /** Reason codes to attach to the stale/invalidated metadata */
  staleReasonCodes: StaleReasonCode[];
}

// ── Invalidation Output ────────────────────────────────────────

/**
 * Structured output from evaluating the invalidation matrix for a given event.
 * Tells downstream what snapshots are affected without executing recompute.
 */
export interface InvalidationOutput {
  /** The source event that was evaluated */
  sourceEvent: string;
  /** Affected snapshot types with their invalidation details */
  affectedSnapshots: {
    snapshotType: IntelligenceSnapshotType;
    strength: InvalidationStrength;
    staleReasonCodes: StaleReasonCode[];
  }[];
  /** Snapshot types recommended for immediate recompute (strong invalidations) */
  recommendedRecomputeTargets: IntelligenceSnapshotType[];
}

// ── The Matrix ─────────────────────────────────────────────────

/**
 * The canonical invalidation matrix.
 *
 * Each entry maps a source event to the snapshot types it affects,
 * with invalidation strength and reason codes.
 */
export const INVALIDATION_MATRIX: readonly InvalidationRule[] = [
  // ── identity.profile_updated ───────────────────────
  {
    sourceEvent: "identity.profile_updated",
    snapshotType: "cri",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "identity.profile_updated",
    snapshotType: "match",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "identity.profile_updated",
    snapshotType: "gap",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "identity.profile_updated",
    snapshotType: "recommendation",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "identity.profile_updated",
    snapshotType: "verified_state",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },

  // ── training.completed ─────────────────────────────
  {
    sourceEvent: "training.completed",
    snapshotType: "cri",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },
  {
    sourceEvent: "training.completed",
    snapshotType: "gap",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },
  {
    sourceEvent: "training.completed",
    snapshotType: "recommendation",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },
  {
    sourceEvent: "training.completed",
    snapshotType: "match",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },

  // ── trust.verification_completed ───────────────────
  {
    sourceEvent: "trust.verification_completed",
    snapshotType: "verified_state",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },
  {
    sourceEvent: "trust.verification_completed",
    snapshotType: "cri",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },
  {
    sourceEvent: "trust.verification_completed",
    snapshotType: "match",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },
  {
    sourceEvent: "trust.verification_completed",
    snapshotType: "recommendation",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },

  // ── trust.credential_issued ────────────────────────
  {
    sourceEvent: "trust.credential_issued",
    snapshotType: "verified_state",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },
  {
    sourceEvent: "trust.credential_issued",
    snapshotType: "cri",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.CREDENTIALS_UPDATED],
  },

  // ── hiring.job_applied ─────────────────────────────
  {
    sourceEvent: "hiring.job_applied",
    snapshotType: "cri",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "hiring.job_applied",
    snapshotType: "gap",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "hiring.job_applied",
    snapshotType: "recommendation",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },

  // ── hiring.application.status_changed ──────────────
  // (covers rejected, withdrawn, shortlisted, re-applied)
  {
    sourceEvent: "hiring.application.status_changed",
    snapshotType: "gap",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "hiring.application.status_changed",
    snapshotType: "recommendation",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "hiring.application.status_changed",
    snapshotType: "match",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },
  {
    sourceEvent: "hiring.application.status_changed",
    snapshotType: "cri",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.PROFILE_UPDATED],
  },

  // ── hiring.job_published ───────────────────────────
  {
    sourceEvent: "hiring.job_published",
    snapshotType: "match",
    strength: "strong",
    staleReasonCodes: [STALE_REASON.JOB_UPDATED],
  },
  {
    sourceEvent: "hiring.job_published",
    snapshotType: "cri",
    strength: "soft",
    staleReasonCodes: [STALE_REASON.JOB_UPDATED],
  },
] as const;
