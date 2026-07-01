import { describe, it, expect } from "vitest";
import { resolveRejectionMultiEventModifier } from "@/smart-glue/decision-engine";
import type { RecentEventContext } from "@/smart-glue/intelligence/aggregated-event-context.reader";

const makeRecentEvents = (overrides: Partial<RecentEventContext> = {}): RecentEventContext => ({
  available: true,
  hasRecentRejection: false,
  hasRecentApplication: false,
  hasRecentTrainingCompletion: false,
  recentRejectionsCount: 0,
  recentApplicationsCount: 0,
  recentTrainingCompletionsCount: 0,
  lastSignals: [],
  ...overrides,
});

describe("resolveRejectionMultiEventModifier", () => {
  // ── No-op cases (old behavior unchanged) ──────────────────

  it("returns no-op when recentEvents is undefined", () => {
    const result = resolveRejectionMultiEventModifier(undefined, 5, 40);
    expect(result.applied).toBe(false);
  });

  it("returns no-op when recentEvents is not available", () => {
    const result = resolveRejectionMultiEventModifier(
      makeRecentEvents({ available: false }),
      5,
      40,
    );
    expect(result.applied).toBe(false);
  });

  it("returns no-op when no recent rejection", () => {
    const result = resolveRejectionMultiEventModifier(
      makeRecentEvents({ hasRecentRejection: false }),
      5,
      40,
    );
    expect(result.applied).toBe(false);
  });

  it("returns no-op when rejection exists but no gaps", () => {
    const result = resolveRejectionMultiEventModifier(
      makeRecentEvents({ hasRecentRejection: true }),
      0,
      40,
    );
    expect(result.applied).toBe(false);
  });

  // ── Active cases (multi-event triggers) ───────────────────

  it("activates when rejection + gaps >= 1", () => {
    const result = resolveRejectionMultiEventModifier(
      makeRecentEvents({ hasRecentRejection: true }),
      1,
      40,
    );
    expect(result.applied).toBe(true);
    expect(result.boostPriority).toBe(true);
    expect(result.forceRecommendations).toBe(true);
  });

  it("forces CRI refresh when score < 60", () => {
    const result = resolveRejectionMultiEventModifier(
      makeRecentEvents({ hasRecentRejection: true }),
      3,
      45,
    );
    expect(result.applied).toBe(true);
    expect(result.forceCriRefresh).toBe(true);
  });

  it("does NOT force CRI refresh when score >= 60", () => {
    const result = resolveRejectionMultiEventModifier(
      makeRecentEvents({ hasRecentRejection: true }),
      2,
      65,
    );
    expect(result.applied).toBe(true);
    expect(result.forceCriRefresh).toBe(false);
  });

  it("does NOT force CRI refresh when score is null", () => {
    const result = resolveRejectionMultiEventModifier(
      makeRecentEvents({ hasRecentRejection: true }),
      2,
      null,
    );
    expect(result.applied).toBe(true);
    expect(result.forceCriRefresh).toBe(false);
  });

  // ── Determinism ───────────────────────────────────────────

  it("same inputs produce identical output", () => {
    const events = makeRecentEvents({ hasRecentRejection: true });
    const r1 = resolveRejectionMultiEventModifier(events, 3, 42);
    const r2 = resolveRejectionMultiEventModifier(events, 3, 42);
    expect(r1).toEqual(r2);
  });
});
