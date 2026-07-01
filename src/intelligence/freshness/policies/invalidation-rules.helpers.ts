/**
 * Intelligence Invalidation — Rule Helpers
 *
 * Pure functions that evaluate the invalidation matrix for a given source event
 * and return structured policy outputs. No side effects, no recompute execution.
 *
 * Step 9B — Invalidation Matrix
 */

import type { IntelligenceSnapshotType } from "../types/freshness.types";
import {
  INVALIDATION_MATRIX,
  type InvalidationOutput,
  type InvalidationRule,
  type InvalidationStrength,
} from "./invalidation-matrix";

// ── Query Helpers ──────────────────────────────────────────────

/**
 * Get all invalidation rules triggered by a given source event.
 */
export function getRulesForEvent(sourceEvent: string): readonly InvalidationRule[] {
  return INVALIDATION_MATRIX.filter((r) => r.sourceEvent === sourceEvent);
}

/**
 * Get all invalidation rules that affect a given snapshot type.
 */
export function getRulesForSnapshotType(
  snapshotType: IntelligenceSnapshotType,
): readonly InvalidationRule[] {
  return INVALIDATION_MATRIX.filter((r) => r.snapshotType === snapshotType);
}

/**
 * Get all source events that can invalidate a given snapshot type.
 */
export function getSourceEventsForSnapshot(
  snapshotType: IntelligenceSnapshotType,
): string[] {
  const rules = getRulesForSnapshotType(snapshotType);
  return [...new Set(rules.map((r) => r.sourceEvent))];
}

// ── Evaluation ─────────────────────────────────────────────────

/**
 * Evaluate the invalidation matrix for a given source event.
 * Returns a structured InvalidationOutput describing affected snapshots
 * and recommended recompute targets (strong invalidations only).
 *
 * Returns null if the event has no invalidation rules.
 */
export function evaluateInvalidation(sourceEvent: string): InvalidationOutput | null {
  const rules = getRulesForEvent(sourceEvent);
  if (rules.length === 0) return null;

  const affectedSnapshots = rules.map((r) => ({
    snapshotType: r.snapshotType,
    strength: r.strength,
    staleReasonCodes: [...r.staleReasonCodes],
  }));

  const recommendedRecomputeTargets = [
    ...new Set(
      rules
        .filter((r) => r.strength === "strong")
        .map((r) => r.snapshotType),
    ),
  ];

  return {
    sourceEvent,
    affectedSnapshots,
    recommendedRecomputeTargets,
  };
}

/**
 * Check if a specific snapshot type is affected by a given source event.
 */
export function isSnapshotAffectedByEvent(
  snapshotType: IntelligenceSnapshotType,
  sourceEvent: string,
): boolean {
  return INVALIDATION_MATRIX.some(
    (r) => r.sourceEvent === sourceEvent && r.snapshotType === snapshotType,
  );
}

/**
 * Get the invalidation strength for a specific snapshot type + source event pair.
 * Returns null if no rule exists.
 */
export function getInvalidationStrength(
  snapshotType: IntelligenceSnapshotType,
  sourceEvent: string,
): InvalidationStrength | null {
  const rule = INVALIDATION_MATRIX.find(
    (r) => r.sourceEvent === sourceEvent && r.snapshotType === snapshotType,
  );
  return rule?.strength ?? null;
}
