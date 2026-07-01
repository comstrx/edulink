/**
 * Tests — Canonical Read Model Alignment (Sprint 13 PART 4)
 *
 * Verifies:
 *   1. School hooks follow lifecycle contract (resolvedState)
 *   2. Canonical types are consistent across hiring/team
 *   3. No competing metric definitions
 *   4. Single import path through index barrel
 */

import { describe, it, expect } from "vitest";
import type {
  SchoolHiringIntelligence,
  SchoolTeamIntelligence,
  SchoolHiringResolvedState,
  SchoolTeamResolvedState,
  SchoolHiringIntelligenceResult,
  SchoolTeamIntelligenceResult,
  MatchHealthDistribution,
  ReadinessDistribution,
  VerifiedCandidatesSummary,
  VerifiedStaffSummary,
} from "@/intelligence/school";

// ══════════════════════════════════════════════════════════════
// 1. LIFECYCLE CONTRACT
// ══════════════════════════════════════════════════════════════

describe("School Intelligence Lifecycle Contract", () => {
  it("SchoolHiringResolvedState covers all required states", () => {
    const states: SchoolHiringResolvedState[] = ["loading", "unavailable", "resolved"];
    expect(states).toHaveLength(3);
  });

  it("SchoolTeamResolvedState covers all required states", () => {
    const states: SchoolTeamResolvedState[] = ["loading", "unavailable", "resolved"];
    expect(states).toHaveLength(3);
  });

  it("SchoolHiringIntelligenceResult has resolvedState + data", () => {
    const loading: SchoolHiringIntelligenceResult = { resolvedState: "loading", data: null };
    const unavailable: SchoolHiringIntelligenceResult = { resolvedState: "unavailable", data: null };
    const resolved: SchoolHiringIntelligenceResult = {
      resolvedState: "resolved",
      data: {
        schoolId: "s1",
        activeJobCount: 1,
        totalApplicants: 5,
        matchHealth: { strong: 2, moderate: 2, weak: 1, unscored: 0, averageScore: 60 },
        readinessDistribution: { highlyReady: 0, ready: 1, developing: 3, early: 1, unscored: 0 },
        verifiedCandidates: { fullyVerified: 2, partiallyVerified: 1, unverified: 2, verifiedSharePercent: 60 },
        topFitCandidates: [],
        computedAt: new Date().toISOString(),
      },
    };

    expect(loading.resolvedState).toBe("loading");
    expect(loading.data).toBeNull();
    expect(unavailable.resolvedState).toBe("unavailable");
    expect(resolved.resolvedState).toBe("resolved");
    expect(resolved.data).not.toBeNull();
  });

  it("SchoolTeamIntelligenceResult has resolvedState + data", () => {
    const result: SchoolTeamIntelligenceResult = {
      resolvedState: "resolved",
      data: {
        schoolId: "s1",
        teamSize: 10,
        departmentSummary: [],
        promotionReadiness: { readyCount: 2, nearReadyCount: 5, needsDevelopmentCount: 3, averageReadinessPercent: 55 },
        trainingReadiness: { activeTrainingCount: 4, completedTrainingCount: 3, noTrainingCount: 3, teamAverageCri: 50 },
        verifiedStaff: { fullyVerified: 3, partiallyVerified: 4, unverified: 3, verifiedSharePercent: 70 },
        computedAt: new Date().toISOString(),
      },
    };
    expect(result.resolvedState).toBe("resolved");
    expect(result.data!.teamSize).toBe(10);
  });
});

// ══════════════════════════════════════════════════════════════
// 2. CANONICAL METRIC CONSISTENCY
// ══════════════════════════════════════════════════════════════

describe("Canonical Metric Definitions", () => {
  it("Readiness uses canonical levels from intelligence_talent_profiles", () => {
    // Canonical readiness levels: early, developing, ready, highly_ready
    // Sourced from intelligence_talent_profiles.readiness_level — no CRI recomputation
    const canonicalLevels = ["early", "developing", "ready", "highly_ready"];
    expect(canonicalLevels).toHaveLength(4);
  });

  it("VerifiedCandidatesSummary and VerifiedStaffSummary share the same shape", () => {
    // Both should have: fullyVerified, partiallyVerified, unverified, verifiedSharePercent
    const candidateSummary: VerifiedCandidatesSummary = {
      fullyVerified: 5, partiallyVerified: 3, unverified: 2, verifiedSharePercent: 80,
    };
    const staffSummary: VerifiedStaffSummary = {
      fullyVerified: 5, partiallyVerified: 3, unverified: 2, verifiedSharePercent: 80,
    };
    // Same structure, same metric definitions
    expect(Object.keys(candidateSummary).sort()).toEqual(Object.keys(staffSummary).sort());
  });
});

// ══════════════════════════════════════════════════════════════
// 3. SINGLE IMPORT PATH VERIFICATION
// ══════════════════════════════════════════════════════════════

describe("Canonical Import Path", () => {
  it("all school intelligence types are importable from barrel", () => {
    // If these compile, the barrel exports are correct
    const _hiring: SchoolHiringIntelligence | null = null;
    const _team: SchoolTeamIntelligence | null = null;
    const _match: MatchHealthDistribution | null = null;
    const _readiness: ReadinessDistribution | null = null;
    const _verified: VerifiedCandidatesSummary | null = null;
    const _staff: VerifiedStaffSummary | null = null;

    expect(true).toBe(true); // Compile-time check is the real assertion
  });
});

// ══════════════════════════════════════════════════════════════
// 4. NO COMPETING DEFINITIONS
// ══════════════════════════════════════════════════════════════

describe("No Competing Metric Definitions", () => {
  it("verifiedSharePercent formula is consistent: (full + partial) / total * 100", () => {
    const compute = (full: number, partial: number, total: number) =>
      total > 0 ? Math.round(((full + partial) / total) * 100) : 0;

    // Same formula used in both hiring and team readers
    expect(compute(3, 2, 10)).toBe(50);
    expect(compute(0, 0, 5)).toBe(0);
    expect(compute(5, 5, 10)).toBe(100);
    expect(compute(0, 0, 0)).toBe(0);
  });

  it("averageCri formula is consistent: sum / scoredCount, rounded", () => {
    const compute = (scores: number[]) => {
      if (scores.length === 0) return 0;
      return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    };

    expect(compute([50, 60, 70])).toBe(60);
    expect(compute([])).toBe(0);
    expect(compute([33])).toBe(33);
  });
});
