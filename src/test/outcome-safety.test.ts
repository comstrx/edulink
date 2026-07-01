/**
 * Sprint 15 PART 6 — Safety Rules Tests
 *
 * Verifies: no drastic changes, no oscillation, deterministic behavior,
 * clamped modifiers, stable recommendation caps.
 */
import { describe, it, expect } from "vitest";
import { resolveFeedbackOverlay } from "@/intelligence/outcomes/feedback-decision-overlay";
import type { TeacherOutcomeFeedback } from "@/intelligence/outcomes/outcome.types";

function makeFeedback(overrides: Partial<TeacherOutcomeFeedback> = {}): TeacherOutcomeFeedback {
  return {
    teacherId: "t1",
    successfulRecommendations: 0,
    recommendationSuccessRate: 0,
    gapClosureRate: 0,
    gapClosureEffectiveness: 0,
    criTrending: "stable",
    readinessImproving: false,
    providerOutcomeScore: 0,
    improvementAfterRejectionScore: 0,
    learnerBand: "steady",
    ...overrides,
  };
}

describe("Sprint 15 PART 6: Safety Rules", () => {
  // ── Clamping ────────────────────────────────────────────────

  it("CRI modifier never exceeds 1.3", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0.99,
      successfulRecommendations: 10,
      gapClosureEffectiveness: 100,
      providerOutcomeScore: 100,
      improvementAfterRejectionScore: 100,
      criTrending: "up",
      learnerBand: "effective",
    }));
    expect(overlay.criPriorityModifier).toBeLessThanOrEqual(1.3);
  });

  it("CRI modifier never goes below 0.7", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0,
      improvementAfterRejectionScore: 5,
      criTrending: "down",
      gapClosureEffectiveness: 0,
      learnerBand: "struggling",
    }));
    expect(overlay.criPriorityModifier).toBeGreaterThanOrEqual(0.7);
  });

  it("recommendation cap never drops below 1", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      improvementAfterRejectionScore: 5,
      criTrending: "down",
      learnerBand: "struggling",
    }));
    expect(overlay.recommendationCap).toBeGreaterThanOrEqual(1);
  });

  it("recommendation cap never exceeds 4", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0.6,
      successfulRecommendations: 1,
    }));
    if (overlay.recommendationCap !== null) {
      expect(overlay.recommendationCap).toBeLessThanOrEqual(4);
    }
  });

  // ── Anti-Oscillation ────────────────────────────────────────

  it("conflicting boost + suppress → suppress wins, CRI neutralized", () => {
    // Force both case1 (boost) and case4 (suppress) conditions
    const overlay = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0.6,    // case1 triggers boost
      improvementAfterRejectionScore: 10, // case4 triggers suppress
      criTrending: "down",                // case4 activates
    }));
    // Anti-oscillation: CRI boost neutralized because priorityOverride="high"
    expect(overlay.criPriorityModifier).toBe(1.0);
    expect(overlay.priorityOverride).toBe("high");
    expect(overlay.recommendationCap).toBe(1);
  });

  // ── Determinism ─────────────────────────────────────────────

  it("same input always produces same output", () => {
    const input = makeFeedback({
      recommendationSuccessRate: 0.55,
      gapClosureEffectiveness: 45,
      providerOutcomeScore: 30,
      improvementAfterRejectionScore: 60,
      criTrending: "up",
      learnerBand: "steady",
    });
    const a = resolveFeedbackOverlay(input);
    const b = resolveFeedbackOverlay(input);
    expect(a.criPriorityModifier).toBe(b.criPriorityModifier);
    expect(a.recommendationCap).toBe(b.recommendationCap);
    expect(a.suppressLowImpact).toBe(b.suppressLowImpact);
    expect(a.boostGapAligned).toBe(b.boostGapAligned);
    expect(a.priorityOverride).toBe(b.priorityOverride);
  });

  // ── No Drastic Changes ─────────────────────────────────────

  it("small input change → small output change", () => {
    const base = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0.49,
      improvementAfterRejectionScore: 50,
    }));
    const nudged = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0.51,
      improvementAfterRejectionScore: 50,
    }));
    // CRI modifier diff should be small (at most 0.3)
    expect(Math.abs(nudged.criPriorityModifier - base.criPriorityModifier)).toBeLessThanOrEqual(0.3);
  });

  it("null feedback always returns neutral overlay", () => {
    const overlay = resolveFeedbackOverlay(null);
    expect(overlay.criPriorityModifier).toBe(1.0);
    expect(overlay.recommendationCap).toBeNull();
    expect(overlay.suppressLowImpact).toBe(false);
    expect(overlay.boostGapAligned).toBe(false);
    expect(overlay.priorityOverride).toBeNull();
  });
});
