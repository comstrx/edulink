/**
 * Intelligence Recompute — Ordering & Plan Builder
 *
 * Builds structured recompute plans from invalidation outputs.
 * No engine execution — pure policy logic.
 *
 * Step 9C — Recompute Scope & Coordination Policy
 */

import type { IntelligenceSnapshotType, StaleReasonCode } from "../types/freshness.types";
import type { InvalidationOutput } from "./invalidation-matrix";
import {
  RECOMPUTE_ORDER,
  type RecomputePlan,
  type RecomputePriority,
  type RecomputeTarget,
} from "./recompute-policy";
import { classifyRecomputeScope } from "./recompute-scope.helpers";

// ── Ordering ───────────────────────────────────────────────────

/**
 * Sort snapshot types by canonical recompute order.
 * Lower order number = earlier in the recompute sequence.
 */
export function sortRecomputeTargetsByPolicy(
  types: IntelligenceSnapshotType[],
): IntelligenceSnapshotType[] {
  return [...types].sort((a, b) => RECOMPUTE_ORDER[a] - RECOMPUTE_ORDER[b]);
}

// ── Plan Builder ───────────────────────────────────────────────

/**
 * Build a structured recompute plan from an invalidation output.
 *
 * @param invalidation - The output from evaluateInvalidation()
 * @param teacherId - The teacher whose snapshots are affected
 * @param jobId - Optional job context (for teacher×job scoped snapshots)
 * @returns A RecomputePlan, or null if no targets need recompute
 */
export function buildRecomputePlan(
  invalidation: InvalidationOutput,
  teacherId: string,
  jobId?: string,
): RecomputePlan | null {
  if (invalidation.affectedSnapshots.length === 0) return null;

  const hasAnyStrong = invalidation.affectedSnapshots.some((s) => s.strength === "strong");
  const priority: RecomputePriority = hasAnyStrong ? "immediate" : "deferred";

  // Build ordered targets
  const sortedTypes = sortRecomputeTargetsByPolicy(
    invalidation.affectedSnapshots.map((s) => s.snapshotType),
  );

  const targets: RecomputeTarget[] = sortedTypes.map((snapshotType, idx) => {
    const affected = invalidation.affectedSnapshots.find((s) => s.snapshotType === snapshotType)!;
    return {
      snapshotType,
      order: idx + 1,
      strength: affected.strength,
      reasonCodes: [...affected.staleReasonCodes],
    };
  });

  const scopeType = classifyRecomputeScope(
    sortedTypes,
    !!jobId,
  );

  return {
    sourceEvent: invalidation.sourceEvent,
    scopeType,
    priority,
    targets,
    teacherId,
    ...(jobId ? { jobId } : {}),
  };
}

/**
 * Build a recompute plan for a specific subset of snapshot types,
 * independent of the invalidation matrix. Useful for manual/targeted refresh.
 */
export function buildTargetedRecomputePlan(
  snapshotTypes: IntelligenceSnapshotType[],
  teacherId: string,
  options?: {
    sourceEvent?: string;
    jobId?: string;
    priority?: RecomputePriority;
    reasonCodes?: string[];
  },
): RecomputePlan | null {
  if (snapshotTypes.length === 0) return null;

  const sorted = sortRecomputeTargetsByPolicy(snapshotTypes);
  const targets: RecomputeTarget[] = sorted.map((snapshotType, idx) => ({
    snapshotType,
    order: idx + 1,
    strength: "strong" as const,
    reasonCodes: (options?.reasonCodes ?? ["manual_invalidation"]) as StaleReasonCode[],
  }));

  const scopeType = classifyRecomputeScope(sorted, !!options?.jobId);

  return {
    sourceEvent: options?.sourceEvent ?? "manual.recompute_requested",
    scopeType,
    priority: options?.priority ?? "immediate",
    targets,
    teacherId,
    ...(options?.jobId ? { jobId: options.jobId } : {}),
  };
}
