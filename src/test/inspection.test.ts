/**
 * Sprint 5.5 — Inspection & Trace Collector Tests
 *
 * Validates:
 * - Trace collection via in-memory store
 * - Timestamp ordering
 * - InspectionRecord shape & JSON safety
 * - No mutation of source events
 * - Determinism
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { pushTelemetryEvent, collectTrace, clearTraceCollector } from "@/intelligence/observability/inspection/trace-collector";
import { buildInspectionRecord } from "@/intelligence/observability/inspection/inspection.builder";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import type { TelemetryEvent } from "@/intelligence/observability/telemetry.types";
import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";

beforeEach(() => {
  clearTraceCollector();
  vi.restoreAllMocks();
});

// ── Trace Collection ──────────────────────────────────────────

describe("Trace collector", () => {
  it("collects events pushed for a traceId", () => {
    const event: TelemetryEvent = {
      traceId: "t1",
      timestamp: 100,
      engine: "decision-engine",
      stage: "decision",
    };
    pushTelemetryEvent(event);
    const result = collectTrace("t1");
    expect(result).toHaveLength(1);
    expect(result[0].traceId).toBe("t1");
  });

  it("returns empty array for unknown traceId", () => {
    expect(collectTrace("unknown")).toEqual([]);
  });

  it("collects events from logDecisionTrace", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    logDecisionTrace({ traceId: "lt1", decisionType: "rejection" });
    const result = collectTrace("lt1");
    expect(result).toHaveLength(1);
    expect(result[0].engine).toBe("decision-engine");
  });
});

// ── Order Preservation ────────────────────────────────────────

describe("Timestamp ordering", () => {
  it("returns events sorted by timestamp ascending", () => {
    pushTelemetryEvent({ traceId: "t2", timestamp: 300, engine: "safety-pipeline", stage: "safety" });
    pushTelemetryEvent({ traceId: "t2", timestamp: 100, engine: "decision-engine", stage: "decision" });
    pushTelemetryEvent({ traceId: "t2", timestamp: 200, engine: "cross-domain", stage: "overlay" });

    const result = collectTrace("t2");
    expect(result.map(e => e.timestamp)).toEqual([100, 200, 300]);
  });
});

// ── Inspection Record ─────────────────────────────────────────

describe("Inspection record", () => {
  it("builds complete record with all fields", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    logDecisionTrace({ traceId: "ir1", decisionType: "rejection", metadata: { action: "skip" } });
    logDecisionTrace({ traceId: "ir1", decisionType: "safety_pipeline", metadata: { final: 2 } });

    const record = buildInspectionRecord({ traceId: "ir1" });

    expect(record.traceId).toBe("ir1");
    expect(record.telemetry.length).toBeGreaterThanOrEqual(2);
    expect(record.summary.engineFlow.length).toBeGreaterThanOrEqual(1);
    expect(record.summary.stageFlow.length).toBeGreaterThanOrEqual(1);
  });

  it("includes explainabilityView when explainability provided", () => {
    const meta: ExplainabilityMeta = {
      traceId: "ir2",
      stages: [{ stage: "decision", reasoning: ["overlap=80"] }],
      summary: "High overlap match",
    };
    const record = buildInspectionRecord({ traceId: "ir2", explainability: meta });
    expect(record.explainabilityView).toBeDefined();
    expect(record.explainabilityView!.user.shortReason).toBeTruthy();
    expect(record.explainabilityView!.debug).toBe(meta);
  });

  it("omits explainabilityView when no explainability", () => {
    const record = buildInspectionRecord({ traceId: "ir3" });
    expect(record.explainabilityView).toBeUndefined();
  });
});

// ── No Mutation ───────────────────────────────────────────────

describe("No mutation", () => {
  it("collectTrace returns a copy, not the internal array", () => {
    pushTelemetryEvent({ traceId: "nm1", timestamp: 1, engine: "decision-engine", stage: "decision" });
    const a = collectTrace("nm1");
    const b = collectTrace("nm1");
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ── Determinism ───────────────────────────────────────────────

describe("Determinism", () => {
  it("same input produces same inspection structure", () => {
    const meta: ExplainabilityMeta = {
      traceId: "det1",
      stages: [{ stage: "rule", reasoning: ["matched pattern A"] }],
      summary: "Pattern A matched",
    };
    vi.spyOn(console, "log").mockImplementation(() => {});
    logDecisionTrace({ traceId: "det1", decisionType: "cross_domain" });

    const r1 = buildInspectionRecord({ traceId: "det1", explainability: meta });
    const r2 = buildInspectionRecord({ traceId: "det1", explainability: meta });

    expect(r1.summary).toEqual(r2.summary);
    expect(r1.explainabilityView?.user).toEqual(r2.explainabilityView?.user);
  });
});

// ── JSON Safety ───────────────────────────────────────────────

describe("JSON safety", () => {
  it("InspectionRecord is JSON serializable", () => {
    const meta: ExplainabilityMeta = {
      traceId: "js1",
      stages: [{ stage: "decision", reasoning: ["safe data"] }],
      summary: "Safe",
    };
    vi.spyOn(console, "log").mockImplementation(() => {});
    logDecisionTrace({ traceId: "js1", decisionType: "rejection" });

    const record = buildInspectionRecord({ traceId: "js1", explainability: meta });
    expect(() => JSON.stringify(record)).not.toThrow();

    const parsed = JSON.parse(JSON.stringify(record));
    expect(parsed.traceId).toBe("js1");
    expect(parsed.summary.stageFlow).toBeDefined();
  });
});
