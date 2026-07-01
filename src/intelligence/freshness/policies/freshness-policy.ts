/**
 * Intelligence Freshness — Policy Defaults
 *
 * Default freshness thresholds per snapshot type.
 * These can be overridden by configuration but provide sensible v1 defaults.
 *
 * Step 9A — Freshness Policy Contracts
 */

import type { FreshnessPolicyConfig, IntelligenceSnapshotType } from "../types/freshness.types";

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

/**
 * Default freshness policies per snapshot type.
 *
 * - CRI: fresh for 24h, expires after 7d
 * - Match: fresh for 12h, expires after 3d (job-scoped, changes more frequently)
 * - Gap: fresh for 24h, expires after 7d
 * - Recommendation: fresh for 24h, expires after 7d
 * - Verified State: fresh for 48h, expires after 14d (changes infrequently)
 */
export const DEFAULT_FRESHNESS_POLICIES: Record<IntelligenceSnapshotType, FreshnessPolicyConfig> = {
  cri: {
    snapshotType: "cri",
    freshnessTtlMs: 24 * ONE_HOUR,
    expiryTtlMs: 7 * ONE_DAY,
  },
  match: {
    snapshotType: "match",
    freshnessTtlMs: 12 * ONE_HOUR,
    expiryTtlMs: 3 * ONE_DAY,
  },
  gap: {
    snapshotType: "gap",
    freshnessTtlMs: 24 * ONE_HOUR,
    expiryTtlMs: 7 * ONE_DAY,
  },
  recommendation: {
    snapshotType: "recommendation",
    freshnessTtlMs: 24 * ONE_HOUR,
    expiryTtlMs: 7 * ONE_DAY,
  },
  verified_state: {
    snapshotType: "verified_state",
    freshnessTtlMs: 48 * ONE_HOUR,
    expiryTtlMs: 14 * ONE_DAY,
  },
};

/**
 * Get the freshness policy for a snapshot type,
 * falling back to defaults if no override is provided.
 */
export function getFreshnessPolicy(
  snapshotType: IntelligenceSnapshotType,
  overrides?: Partial<Record<IntelligenceSnapshotType, FreshnessPolicyConfig>>,
): FreshnessPolicyConfig {
  return overrides?.[snapshotType] ?? DEFAULT_FRESHNESS_POLICIES[snapshotType];
}
