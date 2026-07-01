/**
 * Intelligence Recompute — Scope Helpers
 *
 * Determines scope classification for recompute plans.
 * No engine execution — pure policy logic.
 *
 * Step 9C — Recompute Scope & Coordination Policy
 */

import type { IntelligenceSnapshotType } from "../types/freshness.types";
import type { RecomputeScopeType } from "./recompute-policy";

/** Snapshot types that require a job context */
const JOB_SCOPED_TYPES: ReadonlySet<IntelligenceSnapshotType> = new Set(["cri", "match"]);

/** Snapshot types that are teacher-only (no job context) */
const TEACHER_SCOPED_TYPES: ReadonlySet<IntelligenceSnapshotType> = new Set([
  "gap",
  "recommendation",
  "verified_state",
]);

/**
 * Determine the recompute scope based on affected snapshot types.
 */
export function classifyRecomputeScope(
  targets: IntelligenceSnapshotType[],
  hasJobContext: boolean,
): RecomputeScopeType {
  if (targets.length === 0) return "single_snapshot";
  if (targets.length === 1) return "single_snapshot";

  const hasJobScoped = targets.some((t) => JOB_SCOPED_TYPES.has(t));
  const hasTeacherScoped = targets.some((t) => TEACHER_SCOPED_TYPES.has(t));

  // If both job-scoped and teacher-scoped targets, it's a chain
  if (hasJobScoped && hasTeacherScoped) return "downstream_chain";

  // If only job-scoped targets with job context
  if (hasJobScoped && hasJobContext) return "teacher_job_scope";

  // Multiple teacher-scoped targets
  if (hasTeacherScoped && targets.length > 1) return "downstream_chain";

  return "teacher_scope";
}

/**
 * Filter targets to only those relevant for a teacher-only scope (no job context).
 */
export function getTeacherScopeTargets(
  targets: IntelligenceSnapshotType[],
): IntelligenceSnapshotType[] {
  return targets.filter((t) => TEACHER_SCOPED_TYPES.has(t));
}

/**
 * Filter targets to only those relevant for a teacher×job scope.
 */
export function getTeacherJobScopeTargets(
  targets: IntelligenceSnapshotType[],
): IntelligenceSnapshotType[] {
  return targets.filter((t) => JOB_SCOPED_TYPES.has(t));
}

/**
 * Check if a snapshot type requires a job context.
 */
export function requiresJobContext(snapshotType: IntelligenceSnapshotType): boolean {
  return JOB_SCOPED_TYPES.has(snapshotType);
}
