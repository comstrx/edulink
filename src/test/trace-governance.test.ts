/**
 * Sprint 5.2 — Trace Governance Tests
 *
 * Validates:
 *   - ensureTraceId generates at entry, warns if missing
 *   - assertTraceId warns in downstream layers
 *   - validateTraceConsistency detects mismatches
 *   - Resolvers use provided traceId (no internal generation)
 *   - Same traceId flows across full pipeline
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ensureTraceId,
  assertTraceId,
  validateTraceConsistency,
  clearTraceGovernanceState,
} from "@/intelligence/observability/trace-governance";
import {
  resolveRejectionDecision,
  resolveProfileUpdateDecision,
  resolveTrainingCompletionDecision,
  resolveEvidenceApprovalDecision,
  resolveCrossDomainDecision,
} from "@/smart-glue/decision-engine";
import { resolveSchoolHiringHealth } from "@/smart-glue/decision-engine-school";
import { applyDecisionSafety } from "@/smart-glue/decision-safety";

beforeEach(() => {
  clearTraceGovernanceState();
});

// ── ensureTraceId ────────────────────────────────────────────

describe("ensureTraceId", () => {
  it("returns existing traceId unchanged", () => {
    expect(ensureTraceId("my-trace-123", "test")).toBe("my-trace-123");
  });

  it("generates new traceId when missing and logs warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = ensureTraceId(undefined, "bridge");
    expect(result).toContain("bridge_");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[TraceGov]"));
    warnSpy.mockRestore();
  });
});

// ── assertTraceId ────────────────────────────────────────────

describe("assertTraceId", () => {
  it("returns existing traceId", () => {
    expect(assertTraceId("trace-1", "resolver")).toBe("trace-1");
  });

  it("logs warning and returns fallback when missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = assertTraceId(undefined, "resolver");
    expect(result).toContain("orphan_resolver_");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ── validateTraceConsistency ─────────────────────────────────

describe("validateTraceConsistency", () => {
  it("returns true for matching traces", () => {
    expect(validateTraceConsistency("t1", "t1", "test")).toBe(true);
  });

  it("returns false and warns for mismatched traces", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(validateTraceConsistency("t1", "t2", "test")).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("trace mismatch"));
    warnSpy.mockRestore();
  });
});

// ── Resolver traceId propagation ─────────────────────────────

describe("Resolver traceId propagation (no internal generation)", () => {
  const TRACE = "governance-test-trace";

  it("rejection uses provided traceId", () => {
    const d = resolveRejectionDecision(undefined, TRACE);
    expect(d.explainability!.traceId).toBe(TRACE);
  });

  it("profile update uses provided traceId", () => {
    const d = resolveProfileUpdateDecision(undefined, TRACE);
    expect(d.explainability!.traceId).toBe(TRACE);
  });

  it("training completion uses provided traceId", () => {
    const d = resolveTrainingCompletionDecision(undefined, TRACE);
    expect(d.explainability!.traceId).toBe(TRACE);
  });

  it("evidence approval uses provided traceId", () => {
    const d = resolveEvidenceApprovalDecision(undefined, TRACE);
    expect(d.explainability!.traceId).toBe(TRACE);
  });

  it("cross-domain uses provided traceId", () => {
    const d = resolveCrossDomainDecision(undefined, TRACE);
    expect(d.explainability!.traceId).toBe(TRACE);
  });

  it("school hiring health uses provided traceId", () => {
    const d = resolveSchoolHiringHealth(undefined, TRACE);
    expect(d.explainability!.traceId).toBe(TRACE);
  });
});

// ── Pipeline trace continuity ────────────────────────────────

describe("Pipeline trace continuity", () => {
  it("same traceId flows from decision through safety pipeline", () => {
    const TRACE = "continuity-test";

    const decision = resolveRejectionDecision(undefined, TRACE);
    const crossDecision = resolveCrossDomainDecision(undefined, TRACE);

    const safetyResult = applyDecisionSafety({
      intents: [],
      crossDecision,
      maxIntents: 4,
      eventName: "test_event",
      entityId: "teacher-1",
      traceId: TRACE,
    });

    // All share same traceId
    expect(decision.explainability!.traceId).toBe(TRACE);
    expect(crossDecision.explainability!.traceId).toBe(TRACE);
    expect(safetyResult.explainability!.traceId).toBe(TRACE);
  });
});

// ── Determinism ──────────────────────────────────────────────

describe("Determinism (traceId does not affect output)", () => {
  it("same context produces same decision values regardless of traceId", () => {
    const d1 = resolveRejectionDecision(undefined, "trace-a");
    const d2 = resolveRejectionDecision(undefined, "trace-b");

    expect(d1.topGap).toEqual(d2.topGap);
    expect(d1.hasRecommendations).toBe(d2.hasRecommendations);
    expect(d1.shouldGenerateRecommendations).toBe(d2.shouldGenerateRecommendations);
    expect(d1.shouldRefreshCri).toBe(d2.shouldRefreshCri);
    expect(d1.maxIntents).toBe(d2.maxIntents);
    expect(d1.reasoning).toEqual(d2.reasoning);
  });
});
