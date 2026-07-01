/**
 * Recompute Debug — Service
 *
 * Simulates a recompute plan for a given source event without executing anything.
 * Composes existing invalidation + recompute policy helpers.
 *
 * Phase 10A.3
 */

import { evaluateInvalidation } from "@/intelligence/freshness/policies/invalidation-rules.helpers";
import { buildRecomputePlan } from "@/intelligence/freshness/policies/recompute-order.helpers";
import type { RecomputeDebugResult } from "./recompute-debug.types";

/**
 * Simulate the full invalidation → recompute plan for a source event.
 * Returns a debug-friendly result showing what would happen.
 */
export function simulateRecomputePlan(
  sourceEvent: string,
  teacherId: string = "debug-teacher",
  jobId?: string,
): RecomputeDebugResult {
  const invalidation = evaluateInvalidation(sourceEvent);

  if (!invalidation) {
    console.debug("[RecomputeDebug] No invalidation rules for event:", sourceEvent);
    return {
      sourceEvent,
      hasInvalidation: false,
      invalidatedSnapshots: [],
      recomputeTargets: [],
      recomputeOrder: [],
      priority: null,
      scopeType: null,
      reasonCodes: [],
    };
  }

  const plan = buildRecomputePlan(invalidation, teacherId, jobId);

  const allReasonCodes = [
    ...new Set(invalidation.affectedSnapshots.flatMap((s) => s.staleReasonCodes)),
  ];

  const result: RecomputeDebugResult = {
    sourceEvent,
    hasInvalidation: true,
    invalidatedSnapshots: invalidation.affectedSnapshots,
    recomputeTargets: plan?.targets.map((t) => t.snapshotType) ?? [],
    recomputeOrder: plan?.targets.map((t) => ({
      order: t.order,
      snapshotType: t.snapshotType,
      strength: t.strength,
      reasonCodes: t.reasonCodes,
    })) ?? [],
    priority: plan?.priority ?? null,
    scopeType: plan?.scopeType ?? null,
    reasonCodes: allReasonCodes,
  };

  console.debug("[RecomputeDebug] Simulation result", JSON.stringify(result, null, 2));

  return result;
}
