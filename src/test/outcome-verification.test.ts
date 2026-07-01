/**
 * Sprint 15 PART 8 — Full Verification
 *
 * End-to-end tests proving the system learns from outcomes:
 *   Case 1: Recommendation followed → boost
 *   Case 2: Recommendations ignored → reduce noise
 *   Case 3: Provider effective → prioritized
 *   Case 4: Repeated rejection without improvement → narrow focus
 *
 * Each case tests BEFORE (neutral) vs AFTER (adjusted) behavior.
 */
import { describe, it, expect } from "vitest";
import {
  resolveFeedbackOverlay,
  type FeedbackOverlay,
} from "@/intelligence/outcomes/feedback-decision-overlay";
import {
  detectGapClosureOutcome,
} from "@/intelligence/outcomes/outcome-signal.service";
import {
  resolveProviderCriOverlay,
  resolveProviderRecommendationOverlay,
} from "@/intelligence/provider/provider-decision-overlay";
import {
  deduplicateIntents,
  enforceActionBudget,
} from "@/smart-glue/decision-safety";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { TeacherOutcomeFeedback } from "@/intelligence/outcomes/outcome.types";
import type { IntentEmission } from "@/smart-glue/types";

// ── Helpers ───────────────────────────────────────────────────

function makeFeedback(
  overrides: Partial<TeacherOutcomeFeedback> = {},
): TeacherOutcomeFeedback {
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

/** Neutral baseline — no outcome history */
const NEUTRAL = makeFeedback();

function neutralOverlay(): FeedbackOverlay {
  return resolveFeedbackOverlay(null);
}

// ── Case 1: User follows recommendation → success ────────────

describe("Case 1: Recommendation followed → boost", () => {
  const before = neutralOverlay();
  const after = resolveFeedbackOverlay(
    makeFeedback({
      recommendationSuccessRate: 0.7,
      successfulRecommendations: 4,
      gapClosureRate: 0.5,
      gapClosureEffectiveness: 60,
      providerOutcomeScore: 40,
      improvementAfterRejectionScore: 50,
    }),
  );

  it("BEFORE: neutral CRI modifier", () => {
    expect(before.criPriorityModifier).toBe(1.0);
    expect(before.suppressLowImpact).toBe(false);
    expect(before.recommendationCap).toBeNull();
  });

  it("AFTER: CRI boosted, low-impact suppressed, recs capped", () => {
    expect(after.criPriorityModifier).toBe(1.2);
    expect(after.suppressLowImpact).toBe(true);
    expect(after.recommendationCap).toBeLessThanOrEqual(3);
    expect(after.recommendationCap).toBeGreaterThanOrEqual(1);
  });

  it("DELTA: CRI modifier increased", () => {
    expect(after.criPriorityModifier).toBeGreaterThan(before.criPriorityModifier);
  });

  it("system learned: same teacher, different output", () => {
    expect(after).not.toEqual(before);
  });
});

// ── Case 2: User ignores recommendations → noise reduced ─────

describe("Case 2: Recommendations ignored → reduce noise", () => {
  const before = neutralOverlay();
  const after = resolveFeedbackOverlay(
    makeFeedback({
      recommendationSuccessRate: 0.0,
      successfulRecommendations: 0,
      gapClosureEffectiveness: 10,
      providerOutcomeScore: 20,
      improvementAfterRejectionScore: 40,
    }),
  );

  it("BEFORE: no suppression, no cap", () => {
    expect(before.suppressLowImpact).toBe(false);
    expect(before.recommendationCap).toBeNull();
  });

  it("AFTER: suppresses low-impact, caps at ≤2, gap-aligned", () => {
    expect(after.suppressLowImpact).toBe(true);
    expect(after.boostGapAligned).toBe(true);
    expect(after.recommendationCap).toBeLessThanOrEqual(2);
  });

  it("noise reduced: fewer total possible intents", () => {
    expect(after.recommendationCap).not.toBeNull();
    expect(after.recommendationCap!).toBeLessThanOrEqual(2);
  });
});

// ── Case 3: Provider consistently improves outcomes ──────────

describe("Case 3: Provider effective → prioritized", () => {
  it("BEFORE: unknown provider → neutral treatment", () => {
    const criOverlay = resolveProviderCriOverlay("unknown");
    const recOverlay = resolveProviderRecommendationOverlay("unknown");
    expect(criOverlay.priorityMultiplier).toBe(1.0);
    expect(recOverlay.rankAdjustment).toBe(0);
    expect(recOverlay.suppress).toBe(false);
  });

  it("AFTER: high provider → CRI boosted, recs promoted", () => {
    const criOverlay = resolveProviderCriOverlay("high");
    const recOverlay = resolveProviderRecommendationOverlay("high");
    expect(criOverlay.priorityMultiplier).toBe(1.3);
    expect(criOverlay.boostScope).toBe(true);
    expect(recOverlay.rankAdjustment).toBe(-2); // promoted
    expect(recOverlay.suppress).toBe(false);
  });

  it("feedback overlay also boosts provider recs", () => {
    const overlay = resolveFeedbackOverlay(
      makeFeedback({ providerOutcomeScore: 75 }),
    );
    expect(overlay.boostProviderRecommendations).toBe(true);
  });

  it("low provider → suppressed, not promoted", () => {
    const recOverlay = resolveProviderRecommendationOverlay("low");
    expect(recOverlay.suppress).toBe(true);
    expect(recOverlay.rankAdjustment).toBe(5); // demoted
  });
});

// ── Case 4: Repeated rejection without improvement ───────────

describe("Case 4: Repeated rejection → narrow focus", () => {
  const before = neutralOverlay();
  const after = resolveFeedbackOverlay(
    makeFeedback({
      improvementAfterRejectionScore: 10,
      criTrending: "down",
      gapClosureRate: 0.05,
      gapClosureEffectiveness: 5,
      providerOutcomeScore: 10,
      learnerBand: "struggling",
    }),
  );

  it("BEFORE: no priority override, no cap", () => {
    expect(before.priorityOverride).toBeNull();
    expect(before.recommendationCap).toBeNull();
  });

  it("AFTER: top 1 action only, high priority, gap-aligned", () => {
    expect(after.recommendationCap).toBe(1);
    expect(after.priorityOverride).toBe("high");
    expect(after.boostGapAligned).toBe(true);
  });

  it("focus narrowed: rec cap dropped from unlimited to 1", () => {
    expect(before.recommendationCap).toBeNull();
    expect(after.recommendationCap).toBe(1);
  });
});

// ── Outcome Signal Detection ─────────────────────────────────

describe("Outcome signal detection (foundation for learning)", () => {
  it("gap closure detected → positive signal", () => {
    const result = detectGapClosureOutcome("t1", 3, 5);
    expect(result).not.toBeNull();
    expect(result!.impact).toBe("positive");
    expect(result!.delta).toBe(-3);
    expect(result!.outcomeType).toBe("gap_closure");
  });

  it("no gap closure → null (no signal)", () => {
    expect(detectGapClosureOutcome("t1", 0, 5)).toBeNull();
  });

  it("minor gap closure → neutral signal", () => {
    const result = detectGapClosureOutcome("t1", 1, 5);
    expect(result!.impact).toBe("neutral");
  });
});

// ── Safety: No duplication / No instability ──────────────────

describe("Safety invariants across all cases", () => {
  it("deduplication removes exact duplicates", () => {
    const intents: IntentEmission[] = [
      { intent: EVENT_NAMES.intents.criRefreshRequested, payload: { teacherId: "t1" } },
      { intent: EVENT_NAMES.intents.criRefreshRequested, payload: { teacherId: "t1" } },
      { intent: EVENT_NAMES.intents.skillGapRefreshRequested, payload: { teacherId: "t1" } },
    ];
    const result = deduplicateIntents(intents);
    expect(result).toHaveLength(2);
  });

  it("budget enforcement respects global ceiling", () => {
    const intentNames = [
      EVENT_NAMES.intents.criRefreshRequested,
      EVENT_NAMES.intents.skillGapRefreshRequested,
      EVENT_NAMES.intents.matchRefreshRequested,
      EVENT_NAMES.intents.verifiedStateRefreshRequested,
      EVENT_NAMES.intents.talentProfileRefreshRequested,
      EVENT_NAMES.intents.reputationRefreshRequested,
      EVENT_NAMES.intents.trainingRecommendationRequested,
      EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      EVENT_NAMES.intents.teacherTrustRefreshRequested,
      EVENT_NAMES.intents.mentorReputationRefreshRequested,
    ] as const;
    const intents: IntentEmission[] = intentNames.map((name) => ({
      intent: name,
      payload: { teacherId: "t1" },
    }));
    const result = enforceActionBudget(intents, 20);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it("determinism: identical inputs → identical outputs", () => {
    const fb = makeFeedback({
      recommendationSuccessRate: 0.6,
      providerOutcomeScore: 70,
      improvementAfterRejectionScore: 60,
    });
    const a = resolveFeedbackOverlay(fb);
    const b = resolveFeedbackOverlay(fb);
    expect(a.criPriorityModifier).toBe(b.criPriorityModifier);
    expect(a.recommendationCap).toBe(b.recommendationCap);
    expect(a.boostProviderRecommendations).toBe(b.boostProviderRecommendations);
    expect(a.suppressLowImpact).toBe(b.suppressLowImpact);
    expect(a.priorityOverride).toBe(b.priorityOverride);
  });

  it("no case produces recommendationCap=0", () => {
    const extremes = [
      makeFeedback({ improvementAfterRejectionScore: 0, criTrending: "down" }),
      makeFeedback({ recommendationSuccessRate: 0, gapClosureEffectiveness: 0 }),
      makeFeedback({ learnerBand: "struggling", criTrending: "down", improvementAfterRejectionScore: 1 }),
    ];
    for (const fb of extremes) {
      const overlay = resolveFeedbackOverlay(fb);
      if (overlay.recommendationCap !== null) {
        expect(overlay.recommendationCap).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("CRI modifier always within safe band [0.7, 1.3]", () => {
    const cases = [
      makeFeedback({ recommendationSuccessRate: 1.0, successfulRecommendations: 100 }),
      makeFeedback({ improvementAfterRejectionScore: 0, criTrending: "down" }),
      makeFeedback({}),
    ];
    for (const fb of cases) {
      const overlay = resolveFeedbackOverlay(fb);
      expect(overlay.criPriorityModifier).toBeGreaterThanOrEqual(0.7);
      expect(overlay.criPriorityModifier).toBeLessThanOrEqual(1.3);
    }
  });
});
