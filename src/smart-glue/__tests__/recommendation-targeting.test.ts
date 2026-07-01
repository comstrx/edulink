import { describe, it, expect } from "vitest";
import { resolveRecommendationTargeting } from "@/smart-glue/decision-engine";

describe("resolveRecommendationTargeting", () => {
  // ── No-op ─────────────────────────────────────────────────

  it("returns no-op when no gaps and no completions", () => {
    const r = resolveRecommendationTargeting([], [], 0, false, [], 0);
    expect(r.applied).toBe(false);
  });

  // ── Gap targeting ─────────────────────────────────────────

  it("targets gap term IDs when present", () => {
    const r = resolveRecommendationTargeting(
      ["term-1", "term-2"], ["certification", "language"],
      0.3, false, [], 2,
    );
    expect(r.applied).toBe(true);
    expect(r.gapTermIds).toEqual(["term-1", "term-2"]);
    expect(r.gapCategories).toEqual(["certification", "language"]);
  });

  // ── Trust level ───────────────────────────────────────────

  it("returns verified when ratio >= 0.8 and has credentials", () => {
    const r = resolveRecommendationTargeting(["t1"], ["cert"], 0.9, true, [], 1);
    expect(r.trustLevel).toBe("verified");
  });

  it("returns partial when ratio >= 0.4", () => {
    const r = resolveRecommendationTargeting(["t1"], ["cert"], 0.5, false, [], 1);
    expect(r.trustLevel).toBe("partial");
  });

  it("returns none when ratio < 0.4", () => {
    const r = resolveRecommendationTargeting(["t1"], ["cert"], 0.2, false, [], 1);
    expect(r.trustLevel).toBe("none");
  });

  // ── Exclusion ─────────────────────────────────────────────

  it("excludes completed training term IDs", () => {
    const r = resolveRecommendationTargeting(
      [], [], 0.5, false, ["done-1", "done-2"], 0,
    );
    expect(r.applied).toBe(true);
    expect(r.excludeCompletedTermIds).toEqual(["done-1", "done-2"]);
  });

  // ── Determinism ───────────────────────────────────────────

  it("same inputs produce identical output", () => {
    const r1 = resolveRecommendationTargeting(["t1"], ["cert"], 0.6, true, ["d1"], 2);
    const r2 = resolveRecommendationTargeting(["t1"], ["cert"], 0.6, true, ["d1"], 2);
    expect(r1).toEqual(r2);
  });
});
