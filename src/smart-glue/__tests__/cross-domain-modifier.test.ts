import { describe, it, expect } from "vitest";
import { resolveRejectionCrossDomainModifier } from "@/smart-glue/decision-engine";

describe("resolveRejectionCrossDomainModifier", () => {
  // ── No-op cases ───────────────────────────────────────────

  it("returns no-op when no recent rejection", () => {
    const r = resolveRejectionCrossDomainModifier(false, 3, 2, 0.8, true);
    expect(r.applied).toBe(false);
  });

  it("returns no-op when no gaps", () => {
    const r = resolveRejectionCrossDomainModifier(true, 0, 2, 0.8, true);
    expect(r.applied).toBe(false);
  });

  it("returns no-op when rejection + gaps but no improvement", () => {
    const r = resolveRejectionCrossDomainModifier(true, 2, 0, 0.3, false);
    expect(r.applied).toBe(false);
  });

  // ── Active: training improvement ──────────────────────────

  it("activates when rejection + gaps + training completed", () => {
    const r = resolveRejectionCrossDomainModifier(true, 2, 1, 0.2, false);
    expect(r.applied).toBe(true);
    expect(r.boostRecommendationPriority).toBe(true);
  });

  it("focuses on gap-aligned when completions + gaps >= 2", () => {
    const r = resolveRejectionCrossDomainModifier(true, 3, 2, 0, false);
    expect(r.applied).toBe(true);
    expect(r.focusOnGapAligned).toBe(true);
  });

  it("does NOT focus gap-aligned when gaps < 2", () => {
    const r = resolveRejectionCrossDomainModifier(true, 1, 1, 0, false);
    expect(r.applied).toBe(true);
    expect(r.focusOnGapAligned).toBe(false);
  });

  // ── Active: trust improvement ─────────────────────────────

  it("activates when rejection + gaps + verified credentials", () => {
    const r = resolveRejectionCrossDomainModifier(true, 2, 0, 0.6, true);
    expect(r.applied).toBe(true);
    expect(r.boostMatchRefresh).toBe(true);
  });

  it("does NOT boost match when ratio below threshold", () => {
    const r = resolveRejectionCrossDomainModifier(true, 2, 0, 0.4, true);
    expect(r.applied).toBe(false); // no improvement signal met
  });

  // ── Both improvements ─────────────────────────────────────

  it("activates both when training + trust improved", () => {
    const r = resolveRejectionCrossDomainModifier(true, 3, 2, 0.7, true);
    expect(r.applied).toBe(true);
    expect(r.boostRecommendationPriority).toBe(true);
    expect(r.focusOnGapAligned).toBe(true);
    expect(r.boostMatchRefresh).toBe(true);
  });

  // ── Determinism ───────────────────────────────────────────

  it("same inputs produce identical output", () => {
    const r1 = resolveRejectionCrossDomainModifier(true, 3, 1, 0.6, true);
    const r2 = resolveRejectionCrossDomainModifier(true, 3, 1, 0.6, true);
    expect(r1).toEqual(r2);
  });
});
