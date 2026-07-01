/**
 * Snapshot Inspector — Types
 *
 * Defines the shape of a full intelligence state inspection for a teacher.
 * Used for developer debugging / observability only.
 *
 * Phase 10A.2
 */

import type { FreshnessStatus } from "@/intelligence/freshness/types/freshness.types";
import type { InvalidationStrength } from "@/intelligence/freshness/policies/invalidation-matrix";
import type { IntelligenceSnapshotType } from "@/intelligence/freshness/types/freshness.types";

/** Freshness metadata attached to each inspected snapshot */
export interface InspectedFreshness {
  status: FreshnessStatus;
  computedAt: string | null;
  invalidatedAt: string | null;
  staleReasonCodes: string[];
  lastSuccessfulComputationAt: string | null;
}

/** Recompute hints for a snapshot */
export interface InspectedRecomputeHint {
  recommendedRecomputeTargets: IntelligenceSnapshotType[];
  invalidationStrength: InvalidationStrength | null;
  lastTriggerEvent: string | null;
}

/** A single inspected snapshot entry */
export interface InspectedSnapshot<T = Record<string, unknown>> {
  snapshotType: IntelligenceSnapshotType;
  exists: boolean;
  data: T | null;
  freshness: InspectedFreshness;
  recomputeHints: InspectedRecomputeHint;
  engineVersion: string | null;
  snapshotId: string | null;
}

/** Full inspection result for a teacher */
export interface TeacherSnapshotInspection {
  teacherId: string;
  inspectedAt: string;
  snapshots: {
    cri: InspectedSnapshot;
    match: InspectedSnapshot[];
    gap: InspectedSnapshot;
    recommendation: InspectedSnapshot;
    verifiedState: InspectedSnapshot;
  };
  summary: {
    totalSnapshots: number;
    freshCount: number;
    staleCount: number;
    missingCount: number;
    invalidatedCount: number;
  };
}
