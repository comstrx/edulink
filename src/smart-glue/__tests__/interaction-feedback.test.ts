/**
 * Interaction Feedback Rule Test — Sprint 4.6, Steps 3–4
 *
 * Tests Case 5 of the feedback overlay: interaction signals
 * including CRI modifier AND priority adjustment.
 */
import { describe, it, expect } from "vitest";
import { resolveFeedbackOverlay } from "@/intelligence/outcomes/feedback-decision-overlay";
import type { InteractionSignals } from "@/intelligence/feedback/interaction-signal.reader";

describe("Case 5: Interaction Signals — CRI Modifier", () => {
  it("returns neutral overlay when no feedback and no interaction", () => {
    const overlay = resolveFeedbackOverlay(null, null);
    expect(overlay.criPriorityModifier).toBe(1.0);
    expect(overlay.suppressLowImpact).toBe(false);
    expect(overlay.priorityOverride).toBeNull();
  });

  it("high execution rate → CRI boost", () => {
    const interaction: InteractionSignals = {
      totalClicks: 10, totalExecutions: 8, executionRate: 0.8, recentExecutions: 5,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.criPriorityModifier).toBeCloseTo(1.1, 2);
  });

  it("low execution rate + no recent → CRI dampen + suppress", () => {
    const interaction: InteractionSignals = {
      totalClicks: 10, totalExecutions: 2, executionRate: 0.2, recentExecutions: 0,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.criPriorityModifier).toBeCloseTo(0.9, 2);
    expect(overlay.suppressLowImpact).toBe(true);
  });

  it("too few clicks → no case 5 triggers", () => {
    const interaction: InteractionSignals = {
      totalClicks: 2, totalExecutions: 0, executionRate: 0, recentExecutions: 0,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.criPriorityModifier).toBe(1.0);
    expect(overlay.priorityOverride).toBeNull();
  });

  it("moderate execution rate → no trigger (middle zone)", () => {
    const interaction: InteractionSignals = {
      totalClicks: 10, totalExecutions: 5, executionRate: 0.5, recentExecutions: 3,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.criPriorityModifier).toBe(1.0);
    expect(overlay.priorityOverride).toBeNull();
  });

  it("CRI boost stays within bounds", () => {
    const interaction: InteractionSignals = {
      totalClicks: 100, totalExecutions: 100, executionRate: 1.0, recentExecutions: 50,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.criPriorityModifier).toBeLessThanOrEqual(1.3);
  });
});

describe("Case 5: Interaction Signals — Priority Adjustment (Step 4)", () => {
  it("high exec rate + recent executions → priority override high", () => {
    const interaction: InteractionSignals = {
      totalClicks: 10, totalExecutions: 8, executionRate: 0.8, recentExecutions: 5,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.priorityOverride).toBe("high");
    expect(overlay.reasoning).toEqual(
      expect.arrayContaining([expect.stringContaining("case5b: high exec rate")])
    );
  });

  it("high exec rate but only 1 recent execution → no priority override", () => {
    const interaction: InteractionSignals = {
      totalClicks: 5, totalExecutions: 4, executionRate: 0.8, recentExecutions: 1,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.priorityOverride).toBeNull();
    // CRI still boosted
    expect(overlay.criPriorityModifier).toBeCloseTo(1.1, 2);
  });

  it("low exec rate + no recent → priority override low", () => {
    const interaction: InteractionSignals = {
      totalClicks: 10, totalExecutions: 2, executionRate: 0.2, recentExecutions: 0,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.priorityOverride).toBe("low");
    expect(overlay.reasoning).toEqual(
      expect.arrayContaining([expect.stringContaining("case5b: low exec rate")])
    );
  });

  it("case4 priority override wins over case5 (stronger case)", () => {
    // Case 4 sets priorityOverride = "high" — case5 low should NOT override it
    const interaction: InteractionSignals = {
      totalClicks: 10, totalExecutions: 2, executionRate: 0.2, recentExecutions: 0,
    };
    const feedback = {
      teacherId: "t1",
      successfulRecommendations: 0,
      recommendationSuccessRate: 0.1,
      gapClosureRate: 0.1,
      gapClosureEffectiveness: 10,
      criTrending: "down" as const,
      readinessImproving: false,
      providerOutcomeScore: 10,
      improvementAfterRejectionScore: 10,
      learnerBand: "struggling" as const,
    };
    const overlay = resolveFeedbackOverlay(feedback, interaction);
    // Case 4 fires first and sets priorityOverride = "high"
    expect(overlay.priorityOverride).toBe("high");
  });

  it("new user (0 clicks) → no feedback effect, original behavior", () => {
    const interaction: InteractionSignals = {
      totalClicks: 0, totalExecutions: 0, executionRate: 0, recentExecutions: 0,
    };
    const overlay = resolveFeedbackOverlay(null, interaction);
    expect(overlay.criPriorityModifier).toBe(1.0);
    expect(overlay.priorityOverride).toBeNull();
    expect(overlay.suppressLowImpact).toBe(false);
  });

  it("deterministic — same input → same output", () => {
    const interaction: InteractionSignals = {
      totalClicks: 10, totalExecutions: 8, executionRate: 0.8, recentExecutions: 5,
    };
    const a = resolveFeedbackOverlay(null, interaction);
    const b = resolveFeedbackOverlay(null, interaction);
    expect(a.criPriorityModifier).toBe(b.criPriorityModifier);
    expect(a.priorityOverride).toBe(b.priorityOverride);
    expect(a.suppressLowImpact).toBe(b.suppressLowImpact);
  });
});
