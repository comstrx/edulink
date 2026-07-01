/**
 * Invalidation Matrix — Unit Tests
 *
 * Step 9B — Source event → snapshot invalidation policy
 */

import { describe, it, expect } from "vitest";
import {
  evaluateInvalidation,
  getRulesForEvent,
  getRulesForSnapshotType,
  getSourceEventsForSnapshot,
  isSnapshotAffectedByEvent,
  getInvalidationStrength,
  INVALIDATION_MATRIX,
} from "@/intelligence/freshness";

// ── Matrix integrity ───────────────────────────────────────────

describe("INVALIDATION_MATRIX", () => {
  it("has rules for all five snapshot types", () => {
    const types = new Set(INVALIDATION_MATRIX.map((r) => r.snapshotType));
    expect(types).toContain("cri");
    expect(types).toContain("match");
    expect(types).toContain("gap");
    expect(types).toContain("recommendation");
    expect(types).toContain("verified_state");
  });

  it("every rule has at least one stale reason code", () => {
    for (const rule of INVALIDATION_MATRIX) {
      expect(rule.staleReasonCodes.length).toBeGreaterThan(0);
    }
  });
});

// ── getRulesForEvent ───────────────────────────────────────────

describe("getRulesForEvent", () => {
  it("returns rules for identity.profile_updated", () => {
    const rules = getRulesForEvent("identity.profile_updated");
    expect(rules.length).toBe(5); // cri, match, gap, recommendation, verified_state
    const types = rules.map((r) => r.snapshotType);
    expect(types).toContain("cri");
    expect(types).toContain("match");
    expect(types).toContain("verified_state");
  });

  it("returns empty for unknown event", () => {
    expect(getRulesForEvent("unknown.event")).toHaveLength(0);
  });
});

// ── getRulesForSnapshotType ────────────────────────────────────

describe("getRulesForSnapshotType", () => {
  it("CRI is affected by multiple source events", () => {
    const rules = getRulesForSnapshotType("cri");
    expect(rules.length).toBeGreaterThanOrEqual(4);
  });

  it("verified_state is affected by trust events and profile", () => {
    const rules = getRulesForSnapshotType("verified_state");
    const events = rules.map((r) => r.sourceEvent);
    expect(events).toContain("trust.verification_completed");
    expect(events).toContain("trust.credential_issued");
    expect(events).toContain("identity.profile_updated");
  });
});

// ── getSourceEventsForSnapshot ─────────────────────────────────

describe("getSourceEventsForSnapshot", () => {
  it("returns deduplicated source events", () => {
    const events = getSourceEventsForSnapshot("gap");
    expect(events).toContain("identity.profile_updated");
    expect(events).toContain("hiring.application.status_changed");
    // No duplicates
    expect(new Set(events).size).toBe(events.length);
  });
});

// ── evaluateInvalidation ───────────────────────────────────────

describe("evaluateInvalidation", () => {
  it("returns null for unknown events", () => {
    expect(evaluateInvalidation("does.not.exist")).toBeNull();
  });

  it("identity.profile_updated produces strong invalidations for cri/match/gap/recommendation", () => {
    const output = evaluateInvalidation("identity.profile_updated")!;
    expect(output).not.toBeNull();
    expect(output.sourceEvent).toBe("identity.profile_updated");

    const strong = output.affectedSnapshots.filter((s) => s.strength === "strong");
    const strongTypes = strong.map((s) => s.snapshotType);
    expect(strongTypes).toContain("cri");
    expect(strongTypes).toContain("match");
    expect(strongTypes).toContain("gap");
    expect(strongTypes).toContain("recommendation");

    // verified_state is soft
    const vs = output.affectedSnapshots.find((s) => s.snapshotType === "verified_state");
    expect(vs?.strength).toBe("soft");

    // recommendedRecomputeTargets only includes strong
    expect(output.recommendedRecomputeTargets).toContain("cri");
    expect(output.recommendedRecomputeTargets).not.toContain("verified_state");
  });

  it("hiring.job_applied produces only soft invalidations", () => {
    const output = evaluateInvalidation("hiring.job_applied")!;
    expect(output.affectedSnapshots.every((s) => s.strength === "soft")).toBe(true);
    expect(output.recommendedRecomputeTargets).toHaveLength(0);
  });

  it("hiring.application.status_changed strongly invalidates gap and recommendation", () => {
    const output = evaluateInvalidation("hiring.application.status_changed")!;
    const strong = output.recommendedRecomputeTargets;
    expect(strong).toContain("gap");
    expect(strong).toContain("recommendation");
    expect(strong).not.toContain("cri"); // cri is soft here
  });

  it("trust.verification_completed strongly invalidates verified_state and cri", () => {
    const output = evaluateInvalidation("trust.verification_completed")!;
    expect(output.recommendedRecomputeTargets).toContain("verified_state");
    expect(output.recommendedRecomputeTargets).toContain("cri");
  });

  it("hiring.job_published strongly invalidates match", () => {
    const output = evaluateInvalidation("hiring.job_published")!;
    expect(output.recommendedRecomputeTargets).toContain("match");
    expect(output.recommendedRecomputeTargets).not.toContain("cri"); // soft
  });
});

// ── isSnapshotAffectedByEvent ──────────────────────────────────

describe("isSnapshotAffectedByEvent", () => {
  it("returns true for known pairs", () => {
    expect(isSnapshotAffectedByEvent("cri", "identity.profile_updated")).toBe(true);
    expect(isSnapshotAffectedByEvent("verified_state", "trust.verification_completed")).toBe(true);
  });

  it("returns false for unrelated pairs", () => {
    expect(isSnapshotAffectedByEvent("verified_state", "hiring.job_applied")).toBe(false);
  });
});

// ── getInvalidationStrength ────────────────────────────────────

describe("getInvalidationStrength", () => {
  it("returns correct strength for known pairs", () => {
    expect(getInvalidationStrength("cri", "identity.profile_updated")).toBe("strong");
    expect(getInvalidationStrength("verified_state", "identity.profile_updated")).toBe("soft");
    expect(getInvalidationStrength("cri", "hiring.job_applied")).toBe("soft");
  });

  it("returns null for unrelated pairs", () => {
    expect(getInvalidationStrength("verified_state", "hiring.job_applied")).toBeNull();
  });
});
