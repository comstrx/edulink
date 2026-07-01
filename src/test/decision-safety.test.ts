/**
 * Decision Safety Module — Tests
 *
 * Verifies: dedup, conflict resolution, priority-based budget,
 * overlay application, and full pipeline behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  applyCrossDomainOverlay,
  deduplicateIntents,
  resolveConflicts,
  enforceActionBudget,
  applyDecisionSafety,
} from "@/smart-glue/decision-safety";
import type { CrossDomainDecision } from "@/smart-glue/decision-engine";
import type { IntentEmission } from "@/smart-glue/types";
import { EVENT_NAMES } from "@/contracts/core/event-names";

// ── Helpers ───────────────────────────────────────────────────

function makeIntent(intent: string, teacherId = "t1"): IntentEmission {
  return { intent: intent as any, payload: { teacherId, triggeredBy: "test" } };
}

const NONE_DECISION: CrossDomainDecision = {
  scenario: "none",
  recommendationCap: null,
  promoteAdvanced: false,
  suppressBeginner: false,
  boostMatching: false,
  minimizeRecommendations: false,
  priorityOverride: null,
  foundationalOnly: false,
  reasoning: ["none"],
};

function withScenario(
  overrides: Partial<CrossDomainDecision>,
): CrossDomainDecision {
  return { ...NONE_DECISION, ...overrides };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// ── Deduplication ─────────────────────────────────────────────

describe("deduplicateIntents", () => {
  it("removes duplicate intents for same teacher", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.criRefreshRequested, "t1"),
      makeIntent(EVENT_NAMES.intents.criRefreshRequested, "t1"),
      makeIntent(EVENT_NAMES.intents.skillGapRefreshRequested, "t1"),
    ];
    const result = deduplicateIntents(intents);
    expect(result).toHaveLength(2);
  });

  it("preserves different intents for same teacher", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.criRefreshRequested, "t1"),
      makeIntent(EVENT_NAMES.intents.skillGapRefreshRequested, "t1"),
    ];
    expect(deduplicateIntents(intents)).toHaveLength(2);
  });

  it("preserves same intent for different teachers", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.criRefreshRequested, "t1"),
      makeIntent(EVENT_NAMES.intents.criRefreshRequested, "t2"),
    ];
    expect(deduplicateIntents(intents)).toHaveLength(2);
  });
});

// ── Overlay ───────────────────────────────────────────────────

describe("applyCrossDomainOverlay", () => {
  it("returns unchanged for 'none' scenario", () => {
    const intents = [makeIntent(EVENT_NAMES.intents.criRefreshRequested)];
    const result = applyCrossDomainOverlay(intents, NONE_DECISION);
    expect(result).toEqual(intents);
  });

  it("caps recommendation intents", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.trainingRecommendationRequested),
      makeIntent(EVENT_NAMES.intents.growthRecommendationRefreshRequested),
      makeIntent(EVENT_NAMES.intents.criRefreshRequested),
    ];
    const decision = withScenario({
      scenario: "rejection_plus_training_improvement",
      recommendationCap: 1,
    });
    const result = applyCrossDomainOverlay(intents, decision);
    const recCount = result.filter(
      (i) =>
        i.intent === EVENT_NAMES.intents.trainingRecommendationRequested ||
        i.intent === EVENT_NAMES.intents.growthRecommendationRefreshRequested,
    ).length;
    expect(recCount).toBe(1);
    // CRI still present
    expect(result.some((i) => i.intent === EVENT_NAMES.intents.criRefreshRequested)).toBe(true);
  });

  it("minimizes recommendations removes all rec intents", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.trainingRecommendationRequested),
      makeIntent(EVENT_NAMES.intents.growthRecommendationRefreshRequested),
      makeIntent(EVENT_NAMES.intents.criRefreshRequested),
    ];
    const decision = withScenario({
      scenario: "high_cri_verified_evidence",
      minimizeRecommendations: true,
    });
    const result = applyCrossDomainOverlay(intents, decision);
    expect(result).toHaveLength(1);
    expect(result[0].intent).toBe(EVENT_NAMES.intents.criRefreshRequested);
  });

  it("tags intents with cross-domain metadata", () => {
    const intents = [makeIntent(EVENT_NAMES.intents.criRefreshRequested)];
    const decision = withScenario({
      scenario: "low_cri_repeated_failures",
      priorityOverride: "high",
      foundationalOnly: true,
    });
    const result = applyCrossDomainOverlay(intents, decision);
    expect(result[0].payload.crossDomainScenario).toBe("low_cri_repeated_failures");
    expect(result[0].payload.crossDomainPriority).toBe("high");
    expect(result[0].payload.foundationalOnly).toBe(true);
  });
});

// ── Conflict Resolution ───────────────────────────────────────

describe("resolveConflicts", () => {
  it("removes rec intents when high_cri_verified_evidence scenario is tagged", () => {
    const intents = [
      {
        ...makeIntent(EVENT_NAMES.intents.trainingRecommendationRequested),
        payload: {
          teacherId: "t1",
          crossDomainScenario: "high_cri_verified_evidence",
        },
      },
      makeIntent(EVENT_NAMES.intents.criRefreshRequested),
    ];
    const result = resolveConflicts(intents as IntentEmission[]);
    expect(result).toHaveLength(1);
    expect(result[0].intent).toBe(EVENT_NAMES.intents.criRefreshRequested);
  });

  it("does nothing when no conflict exists", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.criRefreshRequested),
      makeIntent(EVENT_NAMES.intents.skillGapRefreshRequested),
    ];
    expect(resolveConflicts(intents)).toHaveLength(2);
  });
});

// ── Budget Enforcement ────────────────────────────────────────

describe("enforceActionBudget", () => {
  it("keeps all intents within budget", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.criRefreshRequested),
      makeIntent(EVENT_NAMES.intents.skillGapRefreshRequested),
    ];
    expect(enforceActionBudget(intents, 4)).toHaveLength(2);
  });

  it("cuts lowest-priority intents when over budget", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.trainingRecommendationRequested), // pri 3
      makeIntent(EVENT_NAMES.intents.criRefreshRequested),             // pri 10
      makeIntent(EVENT_NAMES.intents.reputationRefreshRequested),      // pri 5
      makeIntent(EVENT_NAMES.intents.skillGapRefreshRequested),        // pri 9
    ];
    const result = enforceActionBudget(intents, 2);
    expect(result).toHaveLength(2);
    // Should keep CRI (10) and gaps (9)
    expect(result.map((i) => i.intent)).toContain(EVENT_NAMES.intents.criRefreshRequested);
    expect(result.map((i) => i.intent)).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
  });

  it("respects global ceiling", () => {
    const intents = Array.from({ length: 10 }, (_, i) =>
      makeIntent(EVENT_NAMES.intents.criRefreshRequested, `t${i}`),
    );
    // Even with maxIntents=10, global ceiling limits to 6
    expect(enforceActionBudget(intents, 10).length).toBeLessThanOrEqual(6);
  });
});

// ── Full Pipeline ─────────────────────────────────────────────

describe("applyDecisionSafety", () => {
  it("applies all stages: overlay → dedup → conflicts → budget", () => {
    const intents = [
      makeIntent(EVENT_NAMES.intents.criRefreshRequested, "t1"),
      makeIntent(EVENT_NAMES.intents.criRefreshRequested, "t1"), // dup
      makeIntent(EVENT_NAMES.intents.trainingRecommendationRequested, "t1"),
      makeIntent(EVENT_NAMES.intents.growthRecommendationRefreshRequested, "t1"),
      makeIntent(EVENT_NAMES.intents.skillGapRefreshRequested, "t1"),
    ];

    const crossDecision = withScenario({
      scenario: "rejection_plus_training_improvement",
      recommendationCap: 1,
    });

    const result = applyDecisionSafety({
      intents,
      crossDecision,
      maxIntents: 4,
      eventName: "test",
      entityId: "t1", traceId: "test-trace",
    });

    // 1 dup removed, 1 rec capped, fits in budget
    expect(result.dedupedCount).toBe(1);
    expect(result.overlayReduced).toBeGreaterThanOrEqual(1);
    expect(result.intents.length).toBeLessThanOrEqual(4);
  });

  it("handles empty intents gracefully", () => {
    const result = applyDecisionSafety({
      intents: [],
      crossDecision: NONE_DECISION,
      maxIntents: 4,
      eventName: "test",
      entityId: "t1", traceId: "test-trace",
    });
    expect(result.intents).toHaveLength(0);
    expect(result.dedupedCount).toBe(0);
  });

  it("prevents action explosion even with high maxIntents", () => {
    const intents = Array.from({ length: 12 }, (_, i) =>
      makeIntent(EVENT_NAMES.intents.reputationRefreshRequested, `t${i}`),
    );
    const result = applyDecisionSafety({
      intents,
      crossDecision: NONE_DECISION,
      maxIntents: 20,
      eventName: "test",
      entityId: "t1", traceId: "test-trace",
    });
    // Global ceiling = 6
    expect(result.intents.length).toBeLessThanOrEqual(6);
    expect(result.budgetCut).toBeGreaterThan(0);
  });

  it("logs [IntelDecision] with pipeline trace", () => {
    const logSpy = vi.spyOn(console, "log");
    applyDecisionSafety({
      intents: [makeIntent(EVENT_NAMES.intents.criRefreshRequested)],
      crossDecision: NONE_DECISION,
      maxIntents: 4,
      eventName: "test_event",
      entityId: "t1", traceId: "test-trace",
    });
    expect(logSpy).toHaveBeenCalledWith(
      "[IntelDecision]",
      expect.stringContaining("test_event"),
    );
  });
});
