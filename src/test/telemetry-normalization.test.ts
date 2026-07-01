/**
 * Sprint 5.3 — Telemetry Normalization Tests
 *
 * Validates:
 * - TelemetryEvent shape and JSON serialization
 * - Stage/engine validity
 * - Outcome derivation
 * - Trace consistency
 * - No behavioral regression
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import { VALID_STAGES, VALID_ENGINES } from "@/intelligence/observability/telemetry.types";
import type { TelemetryEvent } from "@/intelligence/observability/telemetry.types";

beforeEach(() => {
  vi.restoreAllMocks();
});

// ── Helper: capture telemetry from logDecisionTrace ───────────

function captureTelemetry(
  ...args: Parameters<typeof logDecisionTrace>
): TelemetryEvent {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  logDecisionTrace(...args);
  const call = logSpy.mock.calls.find(c => c[0] === "[IntelDecision]");
  expect(call).toBeDefined();
  return JSON.parse(call![1] as string) as TelemetryEvent;
}

// ── Shape Tests ───────────────────────────────────────────────

describe("Telemetry shape", () => {
  it("emits all required fields", () => {
    const t = captureTelemetry({
      traceId: "test-trace-001",
      decisionType: "rejection",
      entityId: "t1",
      eventName: "application_rejected",
    });

    expect(t.traceId).toBe("test-trace-001");
    expect(typeof t.timestamp).toBe("number");
    expect(t.engine).toBeDefined();
    expect(t.stage).toBeDefined();
    expect(t.decisionType).toBe("rejection");
  });

  it("is JSON serializable (no circular refs)", () => {
    const t = captureTelemetry({
      traceId: "ser-test",
      decisionType: "safety_pipeline",
      metadata: { nested: { deep: [1, 2, 3] } },
    });

    expect(() => JSON.stringify(t)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(t));
    expect(parsed.traceId).toBe("ser-test");
  });

  it("includes metadata when provided", () => {
    const t = captureTelemetry({
      traceId: "meta-test",
      decisionType: "cross_domain",
      metadata: { scenario: "high_cri_verified_evidence" },
    });

    expect(t.metadata?.scenario).toBe("high_cri_verified_evidence");
  });
});

// ── Stage Validity ────────────────────────────────────────────

describe("Stage classification", () => {
  const cases: Array<[string, string]> = [
    ["rejection", "decision"],
    ["safety_pipeline", "safety"],
    ["feedback_overlay", "feedback"],
    ["provider_overlay", "provider"],
    ["multi_event", "rule"],
    ["recommendation_targeting", "selection"],
    ["cross_domain_modifier", "overlay"],
  ];

  it.each(cases)("maps %s → stage %s", (decisionType, expectedStage) => {
    const t = captureTelemetry({
      traceId: "stage-test",
      decisionType: decisionType as any,
    });
    expect(VALID_STAGES.has(t.stage)).toBe(true);
    expect(t.stage).toBe(expectedStage);
  });
});

// ── Engine Validity ───────────────────────────────────────────

describe("Engine identification", () => {
  const cases: Array<[string, string]> = [
    ["rejection", "decision-engine"],
    ["safety_pipeline", "safety-pipeline"],
    ["feedback_overlay", "feedback-system"],
    ["provider_overlay", "provider-intelligence"],
    ["cross_domain", "cross-domain"],
    ["multi_event", "dispatcher"],
  ];

  it.each(cases)("maps %s → engine %s", (decisionType, expectedEngine) => {
    const t = captureTelemetry({
      traceId: "engine-test",
      decisionType: decisionType as any,
    });
    expect(VALID_ENGINES.has(t.engine)).toBe(true);
    expect(t.engine).toBe(expectedEngine);
  });
});

// ── Outcome Derivation ────────────────────────────────────────

describe("Outcome normalization", () => {
  it("derives 'blocked' for safety pipeline with 0 final intents", () => {
    const t = captureTelemetry({
      traceId: "out-test",
      decisionType: "safety_pipeline",
      metadata: { final: 0 },
    });
    expect(t.outcome).toBe("blocked");
  });

  it("derives 'applied' for safety pipeline with >0 final intents", () => {
    const t = captureTelemetry({
      traceId: "out-test",
      decisionType: "safety_pipeline",
      metadata: { final: 3 },
    });
    expect(t.outcome).toBe("applied");
  });

  it("derives 'skipped' when action is skip", () => {
    const t = captureTelemetry({
      traceId: "out-test",
      decisionType: "profile_update",
      metadata: { action: "skip" },
    });
    expect(t.outcome).toBe("skipped");
  });

  it("derives 'no-op' for provider ignore", () => {
    const t = captureTelemetry({
      traceId: "out-test",
      decisionType: "provider_overlay",
      metadata: { decisionImpact: "ignore" },
    });
    expect(t.outcome).toBe("no-op");
  });

  it("returns undefined outcome when no signals", () => {
    const t = captureTelemetry({
      traceId: "out-test",
      decisionType: "rejection",
    });
    expect(t.outcome).toBeUndefined();
  });
});

// ── Trace Consistency ─────────────────────────────────────────

describe("Trace consistency", () => {
  it("preserves traceId exactly", () => {
    const traceId = "trace_abc123_xyz";
    const t = captureTelemetry({
      traceId,
      decisionType: "rejection",
    });
    expect(t.traceId).toBe(traceId);
  });

  it("same input produces same structure (deterministic)", () => {
    const input = {
      traceId: "det-test",
      decisionType: "cross_domain" as const,
      metadata: { scenario: "none" },
    };
    const t1 = captureTelemetry(input);
    const t2 = captureTelemetry(input);

    expect(t1.engine).toBe(t2.engine);
    expect(t1.stage).toBe(t2.stage);
    expect(t1.outcome).toBe(t2.outcome);
    expect(t1.decisionType).toBe(t2.decisionType);
  });
});

// ── No Regression ─────────────────────────────────────────────

describe("No behavioral regression", () => {
  it("logDecisionTrace does not throw for any decision type", () => {
    const types = [
      "rejection", "profile_update", "training_completion", "evidence_approval",
      "cross_domain", "feedback_overlay", "provider_overlay", "safety_pipeline",
      "school_hiring_health", "job_publish", "verification", "team_capability",
      "multi_event", "contextual_priority", "recommendation_targeting",
      "cross_domain_modifier", "provider_selection",
    ];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    for (const dt of types) {
      expect(() =>
        logDecisionTrace({ traceId: "reg-test", decisionType: dt as any }),
      ).not.toThrow();
    }
    logSpy.mockRestore();
  });
});
