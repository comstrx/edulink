/**
 * Recompute Debug — Types
 *
 * Structured output for simulating recompute plans from source events.
 * Developer/debug use only.
 *
 * Phase 10A.3
 */

import type { IntelligenceSnapshotType, StaleReasonCode } from "@/intelligence/freshness/types/freshness.types";
import type { InvalidationStrength } from "@/intelligence/freshness/policies/invalidation-matrix";
import type { RecomputePriority, RecomputeScopeType } from "@/intelligence/freshness/policies/recompute-policy";

export interface RecomputeDebugResult {
  sourceEvent: string;
  hasInvalidation: boolean;
  invalidatedSnapshots: {
    snapshotType: IntelligenceSnapshotType;
    strength: InvalidationStrength;
    staleReasonCodes: StaleReasonCode[];
  }[];
  recomputeTargets: IntelligenceSnapshotType[];
  recomputeOrder: { order: number; snapshotType: IntelligenceSnapshotType; strength: InvalidationStrength; reasonCodes: StaleReasonCode[] }[];
  priority: RecomputePriority | null;
  scopeType: RecomputeScopeType | null;
  reasonCodes: StaleReasonCode[];
}
