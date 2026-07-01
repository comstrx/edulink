/**
 * Sprint 5 — Explainability & Observability Tests
 *
 * Validates:
 *   - ExplainabilityMeta is correctly built
 *   - Same input → same decision (no behavioral change)
 *   - Explainability does NOT affect output values
 *   - Serialization works (no circular refs)
 */

import { describe, it, expect } from "vitest";
import { buildExplainabilityTrace } from "@/intelligence/observability/explainability.builder";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import { resolveRejectionDecision, resolveTrainingCompletionDecision, resolveEvidenceApprovalDecision, resolveCrossDomainDecision } from "@/smart-glue/decision-engine";
import { resolveSchoolHiringHealth } from "@/smart-glue/decision-engine-school";
import { resolveFeedbackOverlay } from "@/intelligence/outcomes/feedback-decision-overlay";
import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";

// ── Builder Tests ────────────────────────────────────────────

describe("buildExplainabilityTrace", () => {
  it("builds trace from string reasoning", () => {
    const result = buildExplainabilityTrace({
      traceId: "test-1",
      stages: [{ stage: "decision", reasoning: "single reason" }],
    });
    expect(result.traceId).toBe("test-1");
    expect(result.stages).toHaveLength(1);
    expect(result.stages[0].reasoning).toEqual(["single reason"]);
  });

  it("builds trace from string[] reasoning", () => {
    const result = buildExplainabilityTrace({
      traceId: "test-2",
      stages: [{ stage: "decision", reasoning: ["reason 1", "reason 2"] }],
    });
    expect(result.stages[0].reasoning).toEqual(["reason 1", "reason 2"]);
  });

  it("generates default summary", () => {
    const result = buildExplainabilityTrace({
      traceId: "test-3",
      stages: [
        { stage: "a", reasoning: ["r1"] },
        { stage: "b", reasoning: ["r2"] },
      ],
    });
    expect(result.summary).toContain("2 stage(s)");
    expect(result.summary).toContain("a → b");
  });

  it("uses custom summary when provided", () => {
    const result = buildExplainabilityTrace({
      traceId: "test-4",
      stages: [{ stage: "x", reasoning: [] }],
      summary: "custom summary",
    });
    expect(result.summary).toBe("custom summary");
  });

  it("handles empty reasoning arrays", () => {
    const result = buildExplainabilityTrace({
      traceId: "test-5",
      stages: [{ stage: "empty", reasoning: [] }],
    });
    expect(result.stages[0].reasoning).toEqual([]);
    expect(result.summary).toBe("no reasoning captured");
  });

  it("serializes without circular references", () => {
    const result = buildExplainabilityTrace({
      traceId: "test-serial",
      stages: [{ stage: "a", reasoning: ["r1"] }],
    });
    expect(() => JSON.stringify(result)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(result));
    expect(parsed.traceId).toBe("test-serial");
  });
});

// ── Decision Logger Tests ───────────────────────────────────

describe("logDecisionTrace", () => {
  it("does not throw", () => {
    expect(() =>
      logDecisionTrace({
        traceId: "test",
        decisionType: "rejection",
        entityId: "t1",
        eventName: "hiring.application_rejected",
      }),
    ).not.toThrow();
  });

  it("does not throw with explainability", () => {
    const meta: ExplainabilityMeta = {
      traceId: "test",
      stages: [{ stage: "test", reasoning: ["r"] }],
      summary: "test",
    };
    expect(() =>
      logDecisionTrace({
        traceId: "test",
        decisionType: "rejection",
        explainability: meta,
      }),
    ).not.toThrow();
  });
});

// ── Decision Output Stability Tests ─────────────────────────

describe("Decision output stability (no behavioral change)", () => {
  it("rejection decision values unchanged", () => {
    const d1 = resolveRejectionDecision(undefined, "test-trace");
    const d2 = resolveRejectionDecision(undefined, "test-trace");
    // Core values identical
    expect(d1.topGap).toEqual(d2.topGap);
    expect(d1.hasRecommendations).toBe(d2.hasRecommendations);
    expect(d1.shouldGenerateRecommendations).toBe(d2.shouldGenerateRecommendations);
    expect(d1.shouldRefreshCri).toBe(d2.shouldRefreshCri);
    expect(d1.maxIntents).toBe(d2.maxIntents);
    expect(d1.reasoning).toEqual(d2.reasoning);
    // Explainability exists
    expect(d1.explainability).toBeDefined();
    expect(d1.explainability!.stages.length).toBeGreaterThan(0);
  });

  it("training completion decision values unchanged", () => {
    const d = resolveTrainingCompletionDecision(undefined, "test-trace");
    expect(d.closesGap).toBe(false);
    expect(d.shouldGenerateRecommendations).toBe(true);
    expect(d.shouldRefreshCri).toBe(true);
    expect(d.priority).toBe("normal");
  });

  it("evidence approval decision values unchanged", () => {
    const d = resolveEvidenceApprovalDecision(undefined, "test-trace");
    expect(d.isRedundant).toBe(false);
    expect(d.shouldRefreshTrust).toBe(true);
    expect(d.shouldRefreshTalent).toBe(true);
    expect(d.priority).toBe("normal");
  });

  it("cross-domain decision values unchanged without context", () => {
    const d = resolveCrossDomainDecision(undefined, "test-trace");
    expect(d.scenario).toBe("none");
    expect(d.recommendationCap).toBeNull();
    expect(d.reasoning).toEqual(["no cross-domain scenario detected"]);
  });

  it("feedback overlay values unchanged without input", () => {
    const d = resolveFeedbackOverlay(null);
    expect(d.criPriorityModifier).toBe(1.0);
    expect(d.recommendationCap).toBeNull();
    expect(d.suppressLowImpact).toBe(false);
  });

  it("school hiring health values unchanged without context", () => {
    const d = resolveSchoolHiringHealth(undefined, "test-trace");
    expect(d.applied).toBe(false);
    expect(d.diagnosis).toBe("none");
  });
});

// ── Explainability attachment tests ─────────────────────────

describe("Explainability attachment", () => {
  it("rejection decision has explainability", () => {
    const d = resolveRejectionDecision(undefined, "test-trace");
    expect(d.explainability).toBeDefined();
    expect(d.explainability!.traceId).toBeTruthy();
    expect(d.explainability!.stages[0].stage).toBe("rejection_decision");
  });

  it("training completion early return has explainability", () => {
    const d = resolveTrainingCompletionDecision(undefined, "test-trace");
    expect(d.explainability).toBeDefined();
    expect(d.explainability!.traceId).toBeTruthy();
    expect(d.explainability!.stages[0].stage).toBe("training_completion_decision");
  });

  it("evidence approval early return has explainability", () => {
    const d = resolveEvidenceApprovalDecision(undefined, "test-trace");
    expect(d.explainability).toBeDefined();
    expect(d.explainability!.traceId).toBeTruthy();
    expect(d.explainability!.stages[0].stage).toBe("evidence_approval_decision");
  });

  it("cross-domain no-context has explainability", () => {
    const d = resolveCrossDomainDecision(undefined, "test-trace");
    expect(d.explainability).toBeDefined();
    expect(d.explainability!.traceId).toBeTruthy();
  });

  it("school hiring health no-context has explainability", () => {
    const d = resolveSchoolHiringHealth(undefined, "test-trace");
    expect(d.explainability).toBeDefined();
    expect(d.explainability!.traceId).toBeTruthy();
    expect(d.explainability!.stages[0].stage).toBe("school_hiring_health");
  });

  it("feedback overlay has explainability when feedback provided", () => {
    const d = resolveFeedbackOverlay({
      teacherId: "t1",
      successfulRecommendations: 3,
      recommendationSuccessRate: 0.6,
      gapClosureRate: 0.5,
      gapClosureEffectiveness: 50,
      criTrending: "up",
      readinessImproving: true,
      providerOutcomeScore: 70,
      improvementAfterRejectionScore: 60,
      learnerBand: "effective",
    });
    expect(d.explainability).toBeDefined();
    expect(d.explainability!.stages[0].stage).toBe("feedback_overlay");
  });

  it("accepts external traceId and propagates it", () => {
    const d = resolveRejectionDecision(undefined, "ext-trace-123");
    expect(d.explainability!.traceId).toBe("ext-trace-123");
  });

  it("explainability serializes cleanly", () => {
    const d = resolveRejectionDecision(undefined, "test-trace");
    const json = JSON.stringify(d);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.explainability.traceId).toBeTruthy();
  });
});
