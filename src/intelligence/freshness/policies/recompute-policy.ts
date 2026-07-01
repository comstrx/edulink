/**
 * Intelligence Recompute Policy — Types & Constants
 *
 * Defines recompute scope, ordering, and plan structures.
 * No engine execution — pure policy contracts.
 *
 * Step 9C — Recompute Scope & Coordination Policy
 */

import type { IntelligenceSnapshotType, StaleReasonCode } from "../types/freshness.types";
import type { InvalidationStrength } from "./invalidation-matrix";

// ── Recompute Scope ────────────────────────────────────────────

/**
 * The scope of a recompute operation.
 *
 * - single_snapshot:     one specific snapshot (e.g. verified_state for teacher X)
 * - teacher_scope:       all teacher-scoped snapshots for one teacher
 * - teacher_job_scope:   all job-scoped snapshots for one teacher×job pair
 * - downstream_chain:    a dependency-ordered subset (e.g. CRI → Gap → Recommendation)
 */
export type RecomputeScopeType =
  | "single_snapshot"
  | "teacher_scope"
  | "teacher_job_scope"
  | "downstream_chain";

// ── Recompute Priority ─────────────────────────────────────────

/**
 * How urgently the recompute should happen.
 *
 * - immediate:  should run as soon as possible (strong invalidation)
 * - deferred:   can be batched or delayed (soft invalidation)
 */
export type RecomputePriority = "immediate" | "deferred";

// ── Recompute Target ───────────────────────────────────────────

/**
 * A single snapshot to recompute, with ordering and context.
 */
export interface RecomputeTarget {
  snapshotType: IntelligenceSnapshotType;
  /** Execution order (lower = first) */
  order: number;
  /** Invalidation strength that triggered this target */
  strength: InvalidationStrength;
  /** Reason codes explaining why recompute is needed */
  reasonCodes: StaleReasonCode[];
}

// ── Recompute Plan ─────────────────────────────────────────────

/**
 * A structured recompute plan produced by policy evaluation.
 * Tells downstream orchestration *what* to recompute, in *what order*,
 * without executing anything.
 */
export interface RecomputePlan {
  /** The source event that triggered this plan */
  sourceEvent: string;
  /** Scope classification */
  scopeType: RecomputeScopeType;
  /** Overall priority (driven by strongest invalidation in the plan) */
  priority: RecomputePriority;
  /** Ordered list of snapshot targets to recompute */
  targets: RecomputeTarget[];
  /** Teacher ID scope (always present) */
  teacherId: string;
  /** Job ID scope (present only for teacher×job scoped plans) */
  jobId?: string;
}

// ── Recompute Ordering ─────────────────────────────────────────

/**
 * Canonical recompute ordering.
 *
 * Rationale:
 * 1. Verified State — trust foundation; other engines may reference it
 * 2. CRI — core readiness; depends on verified state
 * 3. Match — teacher×job; depends on CRI-like signals
 * 4. Gap — depends on profile + CRI context
 * 5. Recommendation — depends on gaps + CRI + match context
 */
export const RECOMPUTE_ORDER: Record<IntelligenceSnapshotType, number> = {
  verified_state: 1,
  cri: 2,
  match: 3,
  gap: 4,
  recommendation: 5,
};
