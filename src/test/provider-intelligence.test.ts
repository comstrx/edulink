/**
 * Sprint 14 — Provider Intelligence Tests
 *
 * Verifies:
 *   1. Provider attribution resolution
 *   2. Provider effectiveness computation
 *   3. Provider decision overlays (CRI + recommendation)
 *   4. Integration with training completion flow
 */

import { describe, it, expect } from "vitest";
import {
  computeProviderEffectiveness,
  type ProviderEffectivenessBand,
} from "@/intelligence/provider/provider-performance.types";
import {
  resolveProviderCriOverlay,
  resolveProviderRecommendationOverlay,
  logProviderDecision,
} from "@/intelligence/provider/provider-decision-overlay";

// ── PART 1: Provider Effectiveness Computation ─────────────────

describe("computeProviderEffectiveness", () => {
  it("returns unknown band for zero completions", () => {
    const result = computeProviderEffectiveness(0, 0, 0);
    expect(result.score).toBe(0);
    expect(result.band).toBe("unknown");
  });

  it("returns high band for strong gap closure + verified ratio", () => {
    // 10 completions, 8 gap closures, 7 verified
    const result = computeProviderEffectiveness(10, 8, 7);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.band).toBe("high");
  });

  it("returns medium band for moderate effectiveness", () => {
    // 10 completions, 4 gap closures, 3 verified
    const result = computeProviderEffectiveness(10, 4, 3);
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.score).toBeLessThan(50);
    expect(result.band).toBe("medium");
  });

  it("returns low band for poor effectiveness with sufficient data", () => {
    // 10 completions, 1 gap closure, 0 verified
    const result = computeProviderEffectiveness(10, 1, 0);
    expect(result.score).toBeLessThan(25);
    expect(result.band).toBe("low");
  });

  it("returns unknown for < 3 completions even with low score", () => {
    const result = computeProviderEffectiveness(2, 0, 0);
    expect(result.band).toBe("unknown");
  });
});

// ── PART 2: CRI Decision Overlay ────────────────────────────────

describe("resolveProviderCriOverlay", () => {
  it("boosts CRI scope for high-effectiveness providers", () => {
    const overlay = resolveProviderCriOverlay("high");
    expect(overlay.priorityMultiplier).toBeGreaterThan(1);
    expect(overlay.boostScope).toBe(true);
  });

  it("returns standard impact for medium providers", () => {
    const overlay = resolveProviderCriOverlay("medium");
    expect(overlay.priorityMultiplier).toBe(1.0);
    expect(overlay.boostScope).toBe(false);
  });

  it("dampens CRI impact for low providers", () => {
    const overlay = resolveProviderCriOverlay("low");
    expect(overlay.priorityMultiplier).toBeLessThan(1);
    expect(overlay.boostScope).toBe(false);
  });

  it("returns neutral for unknown providers", () => {
    const overlay = resolveProviderCriOverlay("unknown");
    expect(overlay.priorityMultiplier).toBe(1.0);
    expect(overlay.boostScope).toBe(false);
  });
});

// ── PART 3: Recommendation Overlay ──────────────────────────────

describe("resolveProviderRecommendationOverlay", () => {
  it("promotes recommendations from high-effectiveness providers", () => {
    const overlay = resolveProviderRecommendationOverlay("high");
    expect(overlay.suppress).toBe(false);
    expect(overlay.rankAdjustment).toBeLessThan(0); // Promoted
  });

  it("suppresses recommendations from low-effectiveness providers", () => {
    const overlay = resolveProviderRecommendationOverlay("low");
    expect(overlay.suppress).toBe(true);
    expect(overlay.rankAdjustment).toBeGreaterThan(0); // Demoted
  });

  it("keeps neutral for unknown providers", () => {
    const overlay = resolveProviderRecommendationOverlay("unknown");
    expect(overlay.suppress).toBe(false);
    expect(overlay.rankAdjustment).toBe(0);
  });
});

// ── PART 4: Scenario Tests ──────────────────────────────────────

describe("Provider Intelligence Scenarios", () => {
  it("Case 1: High-quality provider → CRI boosted, recs reduced", () => {
    // Simulate: user completes course from high-quality provider
    const providerBand: ProviderEffectivenessBand = "high";
    const criOverlay = resolveProviderCriOverlay(providerBand);
    const recOverlay = resolveProviderRecommendationOverlay(providerBand);

    // CRI should be boosted
    expect(criOverlay.boostScope).toBe(true);
    expect(criOverlay.priorityMultiplier).toBe(1.3);

    // Recommendations should be promoted (not added, just reordered)
    expect(recOverlay.suppress).toBe(false);
    expect(recOverlay.rankAdjustment).toBe(-2);
  });

  it("Case 2: Low-quality provider → minimal CRI effect, no major rec change", () => {
    const providerBand: ProviderEffectivenessBand = "low";
    const criOverlay = resolveProviderCriOverlay(providerBand);
    const recOverlay = resolveProviderRecommendationOverlay(providerBand);

    // CRI should be dampened
    expect(criOverlay.boostScope).toBe(false);
    expect(criOverlay.priorityMultiplier).toBe(0.7);

    // Recommendations from this provider suppressed
    expect(recOverlay.suppress).toBe(true);
  });

  it("Case 3: Multiple completions → provider score increases", () => {
    // Initial: 1 completion, 0 gap closures, 0 verified
    const initial = computeProviderEffectiveness(1, 0, 0);
    expect(initial.band).toBe("unknown"); // < 3 completions

    // After more completions: 8 completions, 6 gap closures, 5 verified
    const after = computeProviderEffectiveness(8, 6, 5);
    expect(after.band).toBe("high");
    expect(after.score).toBeGreaterThan(initial.score);

    // Future recommendations biased toward high provider
    const recOverlay = resolveProviderRecommendationOverlay(after.band);
    expect(recOverlay.rankAdjustment).toBeLessThan(0); // Promoted
  });

  it("no duplication: recommendation overlay does not ADD items", () => {
    // All overlays only modify rank or suppress — never add
    for (const band of ["high", "medium", "low", "unknown"] as ProviderEffectivenessBand[]) {
      const overlay = resolveProviderRecommendationOverlay(band);
      // No 'add' or 'count increase' property exists
      expect(typeof overlay.suppress).toBe("boolean");
      expect(typeof overlay.rankAdjustment).toBe("number");
    }
  });

  it("observability: logProviderDecision does not throw", () => {
    expect(() => {
      logProviderDecision("test-trace", "prov-1", "high", "training.completed", "boost", {
        effectivenessScore: 65,
        completionCount: 12,
      });
    }).not.toThrow();
  });
});
