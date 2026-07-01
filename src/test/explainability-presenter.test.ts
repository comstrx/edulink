/**
 * Explainability Presenter Tests — Sprint 4
 *
 * Verifies: view generation, humanized mappings, completion provenance,
 * fallback behavior, cross-surface consistency.
 */

import { describe, it, expect } from "vitest";
import {
  buildExplainabilityView,
  type ExplainabilityInput,
} from "@/intelligence/explainability/recommendation-explainability.presenter";

const base: ExplainabilityInput = {
  source: "snapshot",
  actionType: "enroll_course",
  status: "new",
  reasonCodes: ["skill_deficit"],
  confidence: "high",
  groupKey: "training_actions",
};

describe("buildExplainabilityView", () => {
  // ── PART 1: View generation ────────────────────────────────

  it("returns all required fields", () => {
    const view = buildExplainabilityView(base);
    expect(view.originExplanation).toBeTruthy();
    expect(view.impactExplanation).toBeTruthy();
    expect(view.reasons).toBeInstanceOf(Array);
    expect(view.confidenceLabel).toBeTruthy();
    expect(view.sourceBadge).toBeTruthy();
    expect(view.categoryLabel).toBeTruthy();
    expect(view.completionExplanation).toBeNull();
    expect(view.pathwayLabel).toBeNull();
  });

  // ── PART 2: Humanized reason mappings ──────────────────────

  it("maps known reason codes to human-readable text", () => {
    const view = buildExplainabilityView(base);
    expect(view.reasons[0]).not.toContain("_"); // no raw underscored keys
    expect(view.reasons[0]).toContain("skill gap");
  });

  it("humanizes unknown reason codes via fallback", () => {
    const view = buildExplainabilityView({ ...base, reasonCodes: ["some_unknown_code"] });
    expect(view.reasons[0]).toBe("Some Unknown Code");
  });

  it("caps reasons at 3", () => {
    const view = buildExplainabilityView({
      ...base,
      reasonCodes: ["a", "b", "c", "d", "e"],
    });
    expect(view.reasons.length).toBe(3);
  });

  // ── PART 3: Completion provenance ──────────────────────────

  it("returns completion explanation for completed_course", () => {
    const view = buildExplainabilityView({
      ...base,
      status: "completed",
      completion_reason_key: "completed_course",
    });
    expect(view.completionExplanation).toBe("Completed after finishing a course");
  });

  it("returns completion explanation for earned_credential", () => {
    const view = buildExplainabilityView({
      ...base,
      status: "completed",
      completion_reason_key: "earned_credential",
    });
    expect(view.completionExplanation).toBe("Completed after earning a credential");
  });

  it("returns completion explanation for completed_pathway", () => {
    const view = buildExplainabilityView({
      ...base,
      status: "completed",
      completion_reason_key: "completed_pathway",
    });
    expect(view.completionExplanation).toBe("Completed after finishing a pathway");
  });

  // ── PART 4: Fallback for legacy rows ───────────────────────

  it("returns fallback completion text when provenance is missing", () => {
    const view = buildExplainabilityView({
      ...base,
      status: "completed",
      completion_reason_key: null,
    });
    expect(view.completionExplanation).toBe("Recommendation completed");
  });

  it("returns null completion for non-completed status", () => {
    const view = buildExplainabilityView({ ...base, status: "new" });
    expect(view.completionExplanation).toBeNull();
  });

  // ── PART 5: Cross-surface consistency ──────────────────────

  it("produces identical output for same input regardless of call count", () => {
    const input: ExplainabilityInput = {
      ...base,
      source: "growth",
      status: "completed",
      completion_reason_key: "completed_course",
    };
    const view1 = buildExplainabilityView(input);
    const view2 = buildExplainabilityView(input);
    expect(view1).toEqual(view2);
  });

  // ── Source-specific origin ─────────────────────────────────

  it("uses growth-specific origin for growth source", () => {
    const view = buildExplainabilityView({ ...base, source: "growth", reasonCodes: [] });
    expect(view.originExplanation).toContain("hiring");
    expect(view.sourceBadge).toBe("From hiring feedback");
  });

  it("uses snapshot-specific origin for snapshot source", () => {
    const view = buildExplainabilityView({ ...base, source: "snapshot", reasonCodes: [] });
    expect(view.originExplanation).toContain("profile");
    expect(view.sourceBadge).toBe("From profile analysis");
  });

  // ── Pathway label ──────────────────────────────────────────

  it("returns pathway label when pathway context is set", () => {
    const view = buildExplainabilityView({
      ...base,
      pathwayContext: { isPathway: true },
    });
    expect(view.pathwayLabel).toBe("Part of your pathway");
  });

  // ── Impact mapping ─────────────────────────────────────────

  it("maps action types to specific impact text", () => {
    const view = buildExplainabilityView({ ...base, actionType: "pursue_credential" });
    expect(view.impactExplanation).toContain("credentials");
  });

  it("falls back to generic impact for unknown action type", () => {
    const view = buildExplainabilityView({ ...base, actionType: "unknown_action", groupKey: undefined });
    expect(view.impactExplanation).toContain("career readiness");
  });
});
