/**
 * Intelligence Freshness — Barrel Export
 *
 * Steps 9A + 9B + 9C — Freshness Policy, Invalidation Matrix, Recompute Policy
 */

// Types
export type {
  FreshnessStatus,
  FreshnessMetadata,
  IntelligenceSnapshotType,
  FreshnessPolicyConfig,
  StaleReasonCode,
} from "./types/freshness.types";

export { STALE_REASON } from "./types/freshness.types";

// Policies
export { DEFAULT_FRESHNESS_POLICIES, getFreshnessPolicy } from "./policies/freshness-policy";

// Freshness Helpers
export {
  isSnapshotFresh,
  isSnapshotStale,
  canDisplaySnapshot,
  needsRecompute,
  classifyTimeFreshness,
  createMissingMetadata,
  markFreshMetadata,
  markInvalidatedMetadata,
  markStaleMetadata,
  markRecomputingMetadata,
  markFailedMetadata,
  resolveSnapshotFreshness,
} from "./policies/freshness-status.helpers";

// Invalidation Matrix (Step 9B)
export type {
  InvalidationStrength,
  InvalidationRule,
  InvalidationOutput,
} from "./policies/invalidation-matrix";

export { INVALIDATION_MATRIX } from "./policies/invalidation-matrix";

export {
  getRulesForEvent,
  getRulesForSnapshotType,
  getSourceEventsForSnapshot,
  evaluateInvalidation,
  isSnapshotAffectedByEvent,
  getInvalidationStrength,
} from "./policies/invalidation-rules.helpers";

// Recompute Policy (Step 9C)
export type {
  RecomputeScopeType,
  RecomputePriority,
  RecomputeTarget,
  RecomputePlan,
} from "./policies/recompute-policy";

export { RECOMPUTE_ORDER } from "./policies/recompute-policy";

export {
  classifyRecomputeScope,
  getTeacherScopeTargets,
  getTeacherJobScopeTargets,
  requiresJobContext,
} from "./policies/recompute-scope.helpers";

export {
  sortRecomputeTargetsByPolicy,
  buildRecomputePlan,
  buildTargetedRecomputePlan,
} from "./policies/recompute-order.helpers";
