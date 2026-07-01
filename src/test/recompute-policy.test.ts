/**
 * Recompute Policy — Unit Tests
 *
 * Step 9C — Scope classification, ordering, and plan building
 */

import { describe, it, expect } from "vitest";
import {
  sortRecomputeTargetsByPolicy,
  buildRecomputePlan,
  buildTargetedRecomputePlan,
  classifyRecomputeScope,
  getTeacherScopeTargets,
  getTeacherJobScopeTargets,
  requiresJobContext,
  evaluateInvalidation,
  RECOMPUTE_ORDER,
} from "@/intelligence/freshness";

// ── Ordering ───────────────────────────────────────────────────

describe("RECOMPUTE_ORDER", () => {
  it("verified_state comes first, recommendation last", () => {
    expect(RECOMPUTE_ORDER.verified_state).toBeLessThan(RECOMPUTE_ORDER.cri);
    expect(RECOMPUTE_ORDER.cri).toBeLessThan(RECOMPUTE_ORDER.match);
    expect(RECOMPUTE_ORDER.match).toBeLessThan(RECOMPUTE_ORDER.gap);
    expect(RECOMPUTE_ORDER.gap).toBeLessThan(RECOMPUTE_ORDER.recommendation);
  });
});

describe("sortRecomputeTargetsByPolicy", () => {
  it("sorts snapshot types by canonical order", () => {
    const sorted = sortRecomputeTargetsByPolicy(["recommendation", "cri", "verified_state", "gap"]);
    expect(sorted).toEqual(["verified_state", "cri", "gap", "recommendation"]);
  });

  it("handles single item", () => {
    expect(sortRecomputeTargetsByPolicy(["match"])).toEqual(["match"]);
  });
});

// ── Scope Classification ───────────────────────────────────────

describe("classifyRecomputeScope", () => {
  it("returns single_snapshot for one target", () => {
    expect(classifyRecomputeScope(["cri"], true)).toBe("single_snapshot");
  });

  it("returns downstream_chain for mixed job+teacher targets", () => {
    expect(classifyRecomputeScope(["cri", "gap", "recommendation"], true)).toBe("downstream_chain");
  });

  it("returns teacher_job_scope for only job-scoped targets with job context", () => {
    expect(classifyRecomputeScope(["cri", "match"], true)).toBe("teacher_job_scope");
  });

  it("returns downstream_chain for multiple teacher-scoped targets", () => {
    expect(classifyRecomputeScope(["gap", "recommendation"], false)).toBe("downstream_chain");
  });
});

describe("getTeacherScopeTargets", () => {
  it("filters to teacher-only types", () => {
    const result = getTeacherScopeTargets(["cri", "gap", "match", "recommendation", "verified_state"]);
    expect(result).toEqual(["gap", "recommendation", "verified_state"]);
  });
});

describe("getTeacherJobScopeTargets", () => {
  it("filters to job-scoped types", () => {
    const result = getTeacherJobScopeTargets(["cri", "gap", "match", "recommendation"]);
    expect(result).toEqual(["cri", "match"]);
  });
});

describe("requiresJobContext", () => {
  it("cri and match require job context", () => {
    expect(requiresJobContext("cri")).toBe(true);
    expect(requiresJobContext("match")).toBe(true);
  });
  it("gap, recommendation, verified_state do not", () => {
    expect(requiresJobContext("gap")).toBe(false);
    expect(requiresJobContext("recommendation")).toBe(false);
    expect(requiresJobContext("verified_state")).toBe(false);
  });
});

// ── Plan Builder ───────────────────────────────────────────────

describe("buildRecomputePlan", () => {
  it("returns null for empty invalidation", () => {
    const plan = buildRecomputePlan(
      { sourceEvent: "test", affectedSnapshots: [], recommendedRecomputeTargets: [] },
      "teacher-1",
    );
    expect(plan).toBeNull();
  });

  it("builds ordered plan from identity.profile_updated", () => {
    const invalidation = evaluateInvalidation("identity.profile_updated")!;
    const plan = buildRecomputePlan(invalidation, "teacher-1")!;

    expect(plan).not.toBeNull();
    expect(plan.teacherId).toBe("teacher-1");
    expect(plan.priority).toBe("immediate"); // has strong invalidations
    expect(plan.sourceEvent).toBe("identity.profile_updated");

    // Targets should be in canonical order
    const types = plan.targets.map((t) => t.snapshotType);
    expect(types[0]).toBe("verified_state");
    expect(types[types.length - 1]).toBe("recommendation");

    // Orders should be sequential
    plan.targets.forEach((t, i) => {
      expect(t.order).toBe(i + 1);
    });
  });

  it("builds deferred plan from hiring.job_applied", () => {
    const invalidation = evaluateInvalidation("hiring.job_applied")!;
    const plan = buildRecomputePlan(invalidation, "teacher-1")!;

    expect(plan.priority).toBe("deferred"); // all soft
  });

  it("includes jobId when provided", () => {
    const invalidation = evaluateInvalidation("hiring.job_published")!;
    const plan = buildRecomputePlan(invalidation, "teacher-1", "job-42")!;

    expect(plan.jobId).toBe("job-42");
  });
});

describe("buildTargetedRecomputePlan", () => {
  it("builds manual recompute plan", () => {
    const plan = buildTargetedRecomputePlan(
      ["gap", "recommendation"],
      "teacher-1",
    )!;

    expect(plan.sourceEvent).toBe("manual.recompute_requested");
    expect(plan.priority).toBe("immediate");
    expect(plan.targets).toHaveLength(2);
    expect(plan.targets[0].snapshotType).toBe("gap");
    expect(plan.targets[1].snapshotType).toBe("recommendation");
  });

  it("returns null for empty targets", () => {
    expect(buildTargetedRecomputePlan([], "teacher-1")).toBeNull();
  });
});
