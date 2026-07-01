/**
 * Sprint 5.4 — Explainability Presentation Mapping Tests
 *
 * Validates:
 * - Mapping correctness (no internal terms leak)
 * - Determinism (same input → same output)
 * - Safety (no undefined/null in UI fields)
 * - Signal extraction accuracy
 * - Multi-level view structure
 */

import { describe, it, expect } from "vitest";
import {
  mapExplainabilityToPresentation,
  buildExplainabilityView,
} from "@/intelligence/explainability/explainability.presentation";
import { buildExplainabilityTrace } from "@/intelligence/observability/explainability.builder";
import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";

// ── Helpers ───────────────────────────────────────────────────

function makeMeta(overrides?: Partial<ExplainabilityMeta>): ExplainabilityMeta {
  return buildExplainabilityTrace({
    traceId: "test-trace",
    stages: [
      {
        stage: "decision",
        reasoning: [
          "matchScore=72 above threshold",
          "gapCount=2 areas detected",
          "criBoostValue=15 applied",
        ],
      },
      {
        stage: "safety",
        reasoning: ["budget enforced", "no conflicts"],
      },
    ],
    ...overrides,
  });
}

// ── Mapping Correctness ───────────────────────────────────────

describe("Mapping correctness", () => {
  it("produces shortReason from summary", () => {
    const meta = makeMeta({ summary: "2 stage(s): decision → safety" });
    const p = mapExplainabilityToPresentation(meta);
    expect(p.shortReason).toBeDefined();
    expect(p.shortReason.length).toBeGreaterThan(0);
  });

  it("produces detailedReasons from stage reasoning", () => {
    const p = mapExplainabilityToPresentation(makeMeta());
    expect(p.detailedReasons.length).toBeGreaterThan(0);
    expect(p.detailedReasons.length).toBeLessThanOrEqual(5);
  });

  it("extracts signals from reasoning", () => {
    const p = mapExplainabilityToPresentation(makeMeta());
    expect(p.signals.length).toBeGreaterThan(0);
    expect(p.signals.length).toBeLessThanOrEqual(3); // user-level cap
  });

  it("sanitizes internal variable names", () => {
    const p = mapExplainabilityToPresentation(makeMeta());
    for (const reason of p.detailedReasons) {
      expect(reason).not.toMatch(/criBoostValue\s*=/);
      expect(reason).not.toMatch(/shouldRefreshCri/);
      expect(reason).not.toMatch(/shouldGenerateRecommendations/);
    }
  });

  it("maps signal types to human labels", () => {
    const p = mapExplainabilityToPresentation(makeMeta());
    for (const signal of p.signals) {
      expect(signal.label).toBeDefined();
      expect(signal.label).not.toMatch(/^[a-z]+[A-Z]/); // No camelCase
    }
  });
});

// ── No Internal Terms Leak ────────────────────────────────────

describe("No internal terms leak", () => {
  const INTERNAL_TERMS = [
    "criBoostValue=",
    "shouldRefreshCri",
    "shouldGenerateRecommendations",
    "suppressBeginner",
    "boostMatching",
    "foundationalOnly",
  ];

  it("user presentation does not contain internal terms", () => {
    const meta = buildExplainabilityTrace({
      traceId: "leak-test",
      stages: [
        {
          stage: "decision",
          reasoning: [
            "criBoostValue=15",
            "shouldRefreshCri triggered",
            "suppressBeginner active",
          ],
        },
      ],
    });
    const p = mapExplainabilityToPresentation(meta);

    for (const term of INTERNAL_TERMS) {
      for (const reason of p.detailedReasons) {
        expect(reason).not.toContain(term);
      }
    }
  });
});

// ── Determinism ───────────────────────────────────────────────

describe("Determinism", () => {
  it("same input produces identical presentation", () => {
    const meta = makeMeta();
    const p1 = mapExplainabilityToPresentation(meta);
    const p2 = mapExplainabilityToPresentation(meta);

    expect(p1.shortReason).toBe(p2.shortReason);
    expect(p1.detailedReasons).toEqual(p2.detailedReasons);
    expect(p1.signals).toEqual(p2.signals);
  });

  it("same input produces identical view at all levels", () => {
    const meta = makeMeta();
    const v1 = buildExplainabilityView(meta);
    const v2 = buildExplainabilityView(meta);

    expect(v1.user).toEqual(v2.user);
    expect(v1.admin).toEqual(v2.admin);
    expect(v1.debug).toEqual(v2.debug);
  });
});

// ── Safety (no undefined/null in UI fields) ───────────────────

describe("Safety", () => {
  it("shortReason is never empty", () => {
    const emptyMeta = buildExplainabilityTrace({
      traceId: "empty",
      stages: [],
    });
    const p = mapExplainabilityToPresentation(emptyMeta);
    expect(p.shortReason.length).toBeGreaterThan(0);
  });

  it("detailedReasons has at least one entry even with empty stages", () => {
    const emptyMeta = buildExplainabilityTrace({
      traceId: "empty",
      stages: [],
    });
    const p = mapExplainabilityToPresentation(emptyMeta);
    expect(p.detailedReasons.length).toBeGreaterThanOrEqual(1);
  });

  it("signals array is never undefined", () => {
    const emptyMeta = buildExplainabilityTrace({
      traceId: "empty",
      stages: [],
    });
    const p = mapExplainabilityToPresentation(emptyMeta);
    expect(Array.isArray(p.signals)).toBe(true);
  });

  it("all signal fields are defined", () => {
    const p = mapExplainabilityToPresentation(makeMeta());
    for (const signal of p.signals) {
      expect(signal.type).toBeDefined();
      expect(signal.label).toBeDefined();
      expect(typeof signal.type).toBe("string");
      expect(typeof signal.label).toBe("string");
    }
  });
});

// ── Multi-Level View ──────────────────────────────────────────

describe("Multi-level ExplainabilityView", () => {
  it("has user, admin, and debug levels", () => {
    const view = buildExplainabilityView(makeMeta());
    expect(view.user).toBeDefined();
    expect(view.admin).toBeDefined();
    expect(view.debug).toBeDefined();
  });

  it("debug level is raw ExplainabilityMeta", () => {
    const meta = makeMeta();
    const view = buildExplainabilityView(meta);
    expect(view.debug).toEqual(meta);
  });

  it("admin has more or equal detail than user", () => {
    const view = buildExplainabilityView(makeMeta());
    expect(view.admin.detailedReasons.length).toBeGreaterThanOrEqual(
      view.user.detailedReasons.length,
    );
    expect(view.admin.signals.length).toBeGreaterThanOrEqual(
      view.user.signals.length,
    );
  });

  it("user signals capped at 3", () => {
    const manySignals = buildExplainabilityTrace({
      traceId: "many",
      stages: [
        {
          stage: "decision",
          reasoning: [
            "matchScore=72",
            "gapCount=2",
            "criBoost=15",
            "overlap=0.8",
            "rejectionRate=0.3",
          ],
        },
      ],
    });
    const view = buildExplainabilityView(manySignals);
    expect(view.user.signals.length).toBeLessThanOrEqual(3);
  });

  it("JSON serializable (no circular refs)", () => {
    const view = buildExplainabilityView(makeMeta());
    expect(() => JSON.stringify(view)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(view));
    expect(parsed.user.shortReason).toBe(view.user.shortReason);
  });
});

// ── Signal Extraction ─────────────────────────────────────────

describe("Signal extraction", () => {
  it("extracts matchScore with correct label", () => {
    const meta = buildExplainabilityTrace({
      traceId: "sig",
      stages: [{ stage: "d", reasoning: ["matchScore=85"] }],
    });
    const p = mapExplainabilityToPresentation(meta);
    const sig = p.signals.find((s) => s.type === "matchScore");
    expect(sig).toBeDefined();
    expect(sig!.label).toBe("Match Score");
    expect(sig!.value).toBe(85);
  });

  it("extracts gapCount with correct label", () => {
    const meta = buildExplainabilityTrace({
      traceId: "sig",
      stages: [{ stage: "d", reasoning: ["gapCount=3 detected"] }],
    });
    const p = mapExplainabilityToPresentation(meta);
    const sig = p.signals.find((s) => s.type === "gapCount");
    expect(sig).toBeDefined();
    expect(sig!.label).toBe("Areas for Growth");
    expect(sig!.value).toBe(3);
  });

  it("ignores unknown signal keys", () => {
    const meta = buildExplainabilityTrace({
      traceId: "sig",
      stages: [{ stage: "d", reasoning: ["internalDebugVar=42"] }],
    });
    const p = mapExplainabilityToPresentation(meta);
    expect(p.signals.find((s) => s.type === "internalDebugVar")).toBeUndefined();
  });

  it("deduplicates signals by key", () => {
    const meta = buildExplainabilityTrace({
      traceId: "dedup",
      stages: [
        { stage: "a", reasoning: ["matchScore=72"] },
        { stage: "b", reasoning: ["matchScore=72 confirmed"] },
      ],
    });
    const p = mapExplainabilityToPresentation(meta);
    const matchSignals = p.signals.filter((s) => s.type === "matchScore");
    expect(matchSignals.length).toBe(1);
  });
});
