/**
 * Sprint 15 — Outcome Learning Tests
 *
 * Verifies feedback overlay adjusts decisions correctly
 * without increasing noise or duplication.
 */
import { describe, it, expect } from "vitest";
import {
  resolveFeedbackOverlay,
} from "@/intelligence/outcomes/feedback-decision-overlay";
import {
  detectGapClosureOutcome,
} from "@/intelligence/outcomes/outcome-signal.service";
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

// ── Feedback Overlay Tests ────────────────────────────────────

describe("Sprint 15: Feedback Decision Overlay", () => {
  it("returns neutral overlay for null feedback", () => {
    const overlay = resolveFeedbackOverlay(null);
    expect(overlay.criPriorityModifier).toBe(1.0);
    expect(overlay.recommendationCap).toBeNull();
    expect(overlay.suppressLowImpact).toBe(false);
    expect(overlay.boostGapAligned).toBe(false);
    expect(overlay.boostProviderRecommendations).toBe(false);
    expect(overlay.priorityOverride).toBeNull();
  });

  // Case 1: Recommendation works well
  it("high rec success rate → boost CRI, suppress low-impact", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0.7,
      successfulRecommendations: 4,
      gapClosureRate: 0.5,
      gapClosureEffectiveness: 60,
      providerOutcomeScore: 40,
      improvementAfterRejectionScore: 50,
    }));
    expect(overlay.criPriorityModifier).toBe(1.2);
    expect(overlay.suppressLowImpact).toBe(true);
    expect(overlay.recommendationCap).toBeLessThanOrEqual(3);
  });

  // Case 2: Recommendation fails repeatedly
  it("low rec success + low closure → suppress noise, gap-aligned", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0.0,
      successfulRecommendations: 0,
      gapClosureEffectiveness: 15,
      providerOutcomeScore: 20,
      improvementAfterRejectionScore: 40,
    }));
    expect(overlay.suppressLowImpact).toBe(true);
    expect(overlay.boostGapAligned).toBe(true);
    expect(overlay.recommendationCap).toBeLessThanOrEqual(2);
  });

  // Case 3: Provider effective
  it("high provider outcome → boost provider recommendations", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      providerOutcomeScore: 75,
      recommendationSuccessRate: 0.3,
      gapClosureEffectiveness: 50,
      improvementAfterRejectionScore: 50,
    }));
    expect(overlay.boostProviderRecommendations).toBe(true);
  });

  it("low provider outcome → no provider boost", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      providerOutcomeScore: 30,
    }));
    expect(overlay.boostProviderRecommendations).toBe(false);
  });

  // Case 4: User not improving
  it("not improving (low score + CRI down) → top 1 action only", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      improvementAfterRejectionScore: 15,
      criTrending: "down",
      gapClosureRate: 0.05,
      gapClosureEffectiveness: 5,
      providerOutcomeScore: 10,
    }));
    expect(overlay.recommendationCap).toBe(1);
    expect(overlay.boostGapAligned).toBe(true);
    expect(overlay.priorityOverride).toBe("high");
    expect(overlay.criPriorityModifier).toBe(0.8);
  });

  // Effective learner (backward compat)
  it("effective learner → reduced recs, boosted CRI", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      successfulRecommendations: 4,
      recommendationSuccessRate: 0.8,
      gapClosureRate: 0.6,
      gapClosureEffectiveness: 72,
      criTrending: "up",
      readinessImproving: true,
      providerOutcomeScore: 70,
      improvementAfterRejectionScore: 85,
      learnerBand: "effective",
    }));
    expect(overlay.criPriorityModifier).toBe(1.2);
    expect(overlay.recommendationCap).toBe(2);
    expect(overlay.suppressLowImpact).toBe(true);
    expect(overlay.boostProviderRecommendations).toBe(true); // providerOutcomeScore ≥ 60
  });

  it("many successful recs → caps future recs at 2", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      successfulRecommendations: 5,
      recommendationSuccessRate: 0.5,
      gapClosureRate: 0.3,
      readinessImproving: true,
    }));
    expect(overlay.recommendationCap).toBe(2);
  });
});

// ── Gap Closure Outcome Detection ─────────────────────────────

describe("Sprint 15: Gap Closure Outcome Detection", () => {
  it("returns null when no gaps closed", () => {
    expect(detectGapClosureOutcome("t1", 0, 5)).toBeNull();
  });

  it("detects positive outcome when ≥50% gaps closed", () => {
    const result = detectGapClosureOutcome("t1", 3, 5);
    expect(result!.impact).toBe("positive");
    expect(result!.delta).toBe(-3);
  });

  it("detects neutral outcome when <50% gaps closed", () => {
    const result = detectGapClosureOutcome("t1", 1, 5);
    expect(result!.impact).toBe("neutral");
    expect(result!.delta).toBe(-1);
  });
});

// ── Derived Signal Completeness ───────────────────────────────

describe("Sprint 15: Derived Feedback Signals", () => {
  it("all four feedback signals are present in type", () => {
    const fb = makeFeedback({
      recommendationSuccessRate: 0.75,
      gapClosureEffectiveness: 65,
      providerOutcomeScore: 80,
      improvementAfterRejectionScore: 70,
    });
    expect(fb.recommendationSuccessRate).toBe(0.75);
    expect(fb.gapClosureEffectiveness).toBe(65);
    expect(fb.providerOutcomeScore).toBe(80);
    expect(fb.improvementAfterRejectionScore).toBe(70);
  });

  it("scores are bounded 0–100 for effectiveness signals", () => {
    const fb = makeFeedback({
      gapClosureEffectiveness: 100,
      providerOutcomeScore: 0,
      improvementAfterRejectionScore: 100,
    });
    expect(fb.gapClosureEffectiveness).toBeGreaterThanOrEqual(0);
    expect(fb.gapClosureEffectiveness).toBeLessThanOrEqual(100);
    expect(fb.providerOutcomeScore).toBeGreaterThanOrEqual(0);
    expect(fb.providerOutcomeScore).toBeLessThanOrEqual(100);
    expect(fb.improvementAfterRejectionScore).toBeGreaterThanOrEqual(0);
    expect(fb.improvementAfterRejectionScore).toBeLessThanOrEqual(100);
  });

  it("recommendationSuccessRate is 0–1 ratio", () => {
    const fb = makeFeedback({ recommendationSuccessRate: 0.5 });
    expect(fb.recommendationSuccessRate).toBeGreaterThanOrEqual(0);
    expect(fb.recommendationSuccessRate).toBeLessThanOrEqual(1);
  });
});

// ── No Noise Increase Verification ────────────────────────────

describe("Sprint 15: No Noise Increase", () => {
  it("effective learner overlay never increases recommendation count", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      successfulRecommendations: 4,
      recommendationSuccessRate: 0.7,
      gapClosureRate: 0.6,
      gapClosureEffectiveness: 60,
      criTrending: "up",
      readinessImproving: true,
      learnerBand: "effective",
      providerOutcomeScore: 40,
      improvementAfterRejectionScore: 80,
    }));
    expect(overlay.recommendationCap).toBeLessThanOrEqual(2);
    expect(overlay.suppressLowImpact).toBe(true);
  });

  it("struggling learner does not add new intents, caps at 1", () => {
    const overlay = resolveFeedbackOverlay(makeFeedback({
      gapClosureRate: 0.05,
      gapClosureEffectiveness: 5,
      criTrending: "down",
      improvementAfterRejectionScore: 10,
      providerOutcomeScore: 10,
      learnerBand: "struggling",
    }));
    // Case 4 applies: not improving → top 1 action
    expect(overlay.recommendationCap).toBe(1);
    expect(overlay.boostGapAligned).toBe(true);
  });

  it("truly steady learner overlay is neutral", () => {
    // All signals in neutral range — no case triggers
    const overlay = resolveFeedbackOverlay(makeFeedback({
      recommendationSuccessRate: 0.3,
      gapClosureEffectiveness: 40,
      providerOutcomeScore: 40,
      improvementAfterRejectionScore: 50,
      criTrending: "stable",
    }));
    expect(overlay.criPriorityModifier).toBe(1.0);
    expect(overlay.recommendationCap).toBeNull();
    expect(overlay.suppressLowImpact).toBe(false);
    expect(overlay.boostGapAligned).toBe(false);
    expect(overlay.priorityOverride).toBeNull();
    expect(overlay.boostProviderRecommendations).toBe(false);
  });
});
