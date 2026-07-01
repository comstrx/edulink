/**
 * Intelligence Freshness — Status Helpers
 *
 * Pure utility functions that reason about snapshot lifecycle.
 * No scoring, no recommendation logic, no side effects.
 *
 * Step 9A — Freshness Policy Contracts
 */

import type {
  FreshnessMetadata,
  FreshnessStatus,
  FreshnessPolicyConfig,
  IntelligenceSnapshotType,
} from "../types/freshness.types";
import { getFreshnessPolicy } from "./freshness-policy";

// ── Status Queries ─────────────────────────────────────────────

/** Returns true if the snapshot is in a "fresh" lifecycle state. */
export function isSnapshotFresh(meta: FreshnessMetadata): boolean {
  return meta.status === "fresh";
}

/** Returns true if the snapshot is stale, invalidated, or failed. */
export function isSnapshotStale(meta: FreshnessMetadata): boolean {
  return meta.status === "stale" || meta.status === "invalidated" || meta.status === "failed";
}

/**
 * Returns true if the snapshot has displayable data,
 * even if stale or recomputing. Only "missing" has no data.
 */
export function canDisplaySnapshot(meta: FreshnessMetadata): boolean {
  return meta.status !== "missing";
}

/**
 * Returns true if the snapshot should be recomputed.
 * True for: missing, stale, invalidated, failed (unless already recomputing).
 */
export function needsRecompute(meta: FreshnessMetadata): boolean {
  if (meta.recomputeInProgress) return false;
  return (
    meta.status === "missing" ||
    meta.status === "stale" ||
    meta.status === "invalidated" ||
    meta.status === "failed"
  );
}

// ── Time-based Classification ──────────────────────────────────

/**
 * Classify a snapshot's time-based freshness given its computedAt timestamp
 * and the applicable policy. Does NOT consider invalidation — only time.
 */
export function classifyTimeFreshness(
  computedAt: string | null,
  snapshotType: IntelligenceSnapshotType,
  now: Date = new Date(),
  policyOverrides?: Partial<Record<IntelligenceSnapshotType, FreshnessPolicyConfig>>,
): "fresh" | "stale" | "expired" | "missing" {
  if (!computedAt) return "missing";

  const policy = getFreshnessPolicy(snapshotType, policyOverrides);
  const age = now.getTime() - new Date(computedAt).getTime();

  if (age <= policy.freshnessTtlMs) return "fresh";
  if (age <= policy.expiryTtlMs) return "stale";
  return "expired";
}

// ── Metadata Factories ─────────────────────────────────────────

/** Create metadata for a snapshot that has never been computed. */
export function createMissingMetadata(): FreshnessMetadata {
  return {
    status: "missing",
    computedAt: null,
    invalidatedAt: null,
    staleReasonCodes: [],
    sourceUpdatedAtHints: {},
    recomputeRequestedAt: null,
    recomputeInProgress: false,
    lastSuccessfulComputationAt: null,
    lastFailureAt: null,
    lastFailureReason: null,
  };
}

/** Create metadata for a freshly computed snapshot. */
export function markFreshMetadata(computedAt: string): FreshnessMetadata {
  return {
    status: "fresh",
    computedAt,
    invalidatedAt: null,
    staleReasonCodes: [],
    sourceUpdatedAtHints: {},
    recomputeRequestedAt: null,
    recomputeInProgress: false,
    lastSuccessfulComputationAt: computedAt,
    lastFailureAt: null,
    lastFailureReason: null,
  };
}

/** Mark an existing metadata as invalidated with reason codes. */
export function markInvalidatedMetadata(
  existing: FreshnessMetadata,
  reasonCodes: string[],
  invalidatedAt: string = new Date().toISOString(),
): FreshnessMetadata {
  return {
    ...existing,
    status: "invalidated",
    invalidatedAt,
    staleReasonCodes: [...new Set([...existing.staleReasonCodes, ...reasonCodes])],
    recomputeInProgress: false,
  };
}

/** Mark an existing metadata as stale with reason codes. */
export function markStaleMetadata(
  existing: FreshnessMetadata,
  reasonCodes: string[],
): FreshnessMetadata {
  return {
    ...existing,
    status: "stale",
    staleReasonCodes: [...new Set([...existing.staleReasonCodes, ...reasonCodes])],
  };
}

/** Mark an existing metadata as recomputing. */
export function markRecomputingMetadata(
  existing: FreshnessMetadata,
  requestedAt: string = new Date().toISOString(),
): FreshnessMetadata {
  return {
    ...existing,
    status: "recomputing",
    recomputeRequestedAt: requestedAt,
    recomputeInProgress: true,
  };
}

/** Mark an existing metadata as failed after a recompute attempt. */
export function markFailedMetadata(
  existing: FreshnessMetadata,
  failureReason: string,
  failedAt: string = new Date().toISOString(),
): FreshnessMetadata {
  return {
    ...existing,
    status: "failed",
    recomputeInProgress: false,
    lastFailureAt: failedAt,
    lastFailureReason: failureReason,
  };
}

// ── Resolve Status from DB Row ─────────────────────────────────

/**
 * Resolve the FreshnessStatus for a snapshot given its DB-level staleness field
 * and its computedAt timestamp. Combines persisted staleness with time-based check.
 */
export function resolveSnapshotFreshness(
  dbStaleness: string,
  computedAt: string | null,
  snapshotType: IntelligenceSnapshotType,
  now: Date = new Date(),
): FreshnessStatus {
  // If DB explicitly marks as stale or invalidated, trust that
  if (dbStaleness === "invalidated") return "invalidated";
  if (dbStaleness === "recomputing") return "recomputing";
  if (dbStaleness === "failed") return "failed";

  // Otherwise, check time-based freshness
  const timeFreshness = classifyTimeFreshness(computedAt, snapshotType, now);
  if (timeFreshness === "missing") return "missing";
  if (timeFreshness === "expired") return "invalidated"; // expired → treat as invalidated
  if (timeFreshness === "stale") return "stale";
  return "fresh";
}
