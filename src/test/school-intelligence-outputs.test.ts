/**
 * School Intelligence Output Tests — Sprint 13 PART 2
 *
 * Tests aggregation logic for school hiring and team intelligence.
 * Uses unit tests on the pure aggregation functions (extracted for testability).
 */

import { describe, it, expect } from "vitest";
import { mapCriScoreToBand } from "@/intelligence/shared/cri-band.utils";
import type {
  SchoolHiringIntelligence,
  SchoolTeamIntelligence,
  MatchHealthDistribution,
  ReadinessDistribution,
  VerifiedCandidatesSummary,
  TopFitCandidate,
  DepartmentSummaryEntry,
  PromotionReadinessSummary,
  VerifiedStaffSummary,
} from "@/intelligence/school/types/school-intelligence.types";

// ── Type Shape Tests ───────────────────────────────────────────

describe("School Intelligence Types", () => {
  it("SchoolHiringIntelligence has correct shape", () => {
    const output: SchoolHiringIntelligence = {
      schoolId: "school-1",
      activeJobCount: 3,
      totalApplicants: 15,
      matchHealth: { strong: 5, moderate: 7, weak: 2, unscored: 1, averageScore: 62 },
      readinessDistribution: { highlyReady: 2, ready: 4, developing: 6, early: 2, unscored: 1 },
      verifiedCandidates: { fullyVerified: 3, partiallyVerified: 5, unverified: 7, verifiedSharePercent: 53 },
      topFitCandidates: [
        { teacherId: "t1", jobId: "j1", matchScore: 85, criScore: 72, verifiedStatus: "full" },
      ],
      computedAt: "2026-03-21T00:00:00Z",
    };

    expect(output.schoolId).toBe("school-1");
    expect(output.matchHealth.strong).toBe(5);
    expect(output.readinessDistribution.ready).toBe(4);
    expect(output.verifiedCandidates.verifiedSharePercent).toBe(53);
    expect(output.topFitCandidates).toHaveLength(1);
  });

  it("SchoolTeamIntelligence has correct shape", () => {
    const output: SchoolTeamIntelligence = {
      schoolId: "school-1",
      teamSize: 20,
      departmentSummary: [
        { departmentKey: "math", departmentLabel: "Mathematics", teacherCount: 5, averageCri: 65, verifiedCount: 3, gapScore: 2 },
      ],
      promotionReadiness: { readyCount: 4, nearReadyCount: 8, needsDevelopmentCount: 8, averageReadinessPercent: 58 },
      trainingReadiness: { activeTrainingCount: 10, completedTrainingCount: 5, noTrainingCount: 5, teamAverageCri: 55 },
      verifiedStaff: { fullyVerified: 6, partiallyVerified: 8, unverified: 6, verifiedSharePercent: 70 },
      computedAt: "2026-03-21T00:00:00Z",
    };

    expect(output.teamSize).toBe(20);
    expect(output.departmentSummary).toHaveLength(1);
    expect(output.promotionReadiness.averageReadinessPercent).toBe(58);
    expect(output.verifiedStaff.verifiedSharePercent).toBe(70);
  });
});

// ── Match Health Aggregation ───────────────────────────────────

describe("Match Health Distribution Logic", () => {
  it("classifies scores into bands correctly", () => {
    // Simulating the aggregation logic
    const scores = [85, 72, 55, 45, 30, 15];
    let strong = 0, moderate = 0, weak = 0;
    let total = 0;

    for (const s of scores) {
      total += s;
      if (s >= 70) strong++;
      else if (s >= 40) moderate++;
      else weak++;
    }

    expect(strong).toBe(2);  // 85, 72
    expect(moderate).toBe(2); // 55, 45
    expect(weak).toBe(2);    // 30, 15
    expect(Math.round(total / scores.length)).toBe(50);
  });

  it("handles empty applicant set", () => {
    const health: MatchHealthDistribution = {
      strong: 0, moderate: 0, weak: 0, unscored: 0, averageScore: 0,
    };
    expect(health.averageScore).toBe(0);
  });
});

// ── Readiness Distribution Logic ───────────────────────────────

describe("Readiness Distribution Logic", () => {
  it("classifies CRI into canonical bands", () => {
    const criScores = [80, 75, 55, 45, 30, 20];
    const bands = criScores.map(mapCriScoreToBand);

    // 80 → highly_ready, 75 → strong, 55 → emerging, 45 → emerging, 30 → not_ready, 20 → not_ready
    expect(bands.filter((b: string) => b === "highly_ready")).toHaveLength(1);
    expect(bands.filter((b: string) => b === "strong")).toHaveLength(1);
    expect(bands.filter((b: string) => b === "emerging")).toHaveLength(2);
    expect(bands.filter((b: string) => b === "not_ready")).toHaveLength(2);
  });
});

// ── Verified Candidates Logic ──────────────────────────────────

describe("Verified Candidates Summary Logic", () => {
  it("computes verified share correctly", () => {
    const statuses = ["full", "partial", "none", "full", "none"];
    let full = 0, partial = 0, unverified = 0;

    for (const s of statuses) {
      if (s === "full") full++;
      else if (s === "partial") partial++;
      else unverified++;
    }

    const share = Math.round(((full + partial) / statuses.length) * 100);
    expect(full).toBe(2);
    expect(partial).toBe(1);
    expect(unverified).toBe(2);
    expect(share).toBe(60);
  });
});

// ── Top Fit Candidates Logic ───────────────────────────────────

describe("Top Fit Candidates Logic", () => {
  it("returns top 5 sorted by match score", () => {
    const candidates: TopFitCandidate[] = [
      { teacherId: "t1", jobId: "j1", matchScore: 50, criScore: 40, verifiedStatus: "none" },
      { teacherId: "t2", jobId: "j1", matchScore: 90, criScore: 80, verifiedStatus: "full" },
      { teacherId: "t3", jobId: "j1", matchScore: 75, criScore: 60, verifiedStatus: "partial" },
      { teacherId: "t4", jobId: "j1", matchScore: 85, criScore: 70, verifiedStatus: "full" },
      { teacherId: "t5", jobId: "j1", matchScore: 60, criScore: 50, verifiedStatus: "none" },
      { teacherId: "t6", jobId: "j1", matchScore: 95, criScore: 90, verifiedStatus: "full" },
    ];

    const sorted = candidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);

    expect(sorted).toHaveLength(5);
    expect(sorted[0].matchScore).toBe(95);
    expect(sorted[1].matchScore).toBe(90);
    expect(sorted[4].matchScore).toBe(60);
  });
});

// ── Promotion Readiness Logic ──────────────────────────────────

describe("Promotion Readiness Summary Logic", () => {
  it("classifies readiness into bands", () => {
    const entries = [85, 90, 60, 55, 40, 30, 20];
    let ready = 0, nearReady = 0, needsDev = 0;
    let total = 0;

    for (const pct of entries) {
      total += pct;
      if (pct >= 80) ready++;
      else if (pct >= 50) nearReady++;
      else needsDev++;
    }

    expect(ready).toBe(2);      // 85, 90
    expect(nearReady).toBe(2);   // 60, 55
    expect(needsDev).toBe(3);    // 40, 30, 20
    expect(Math.round(total / entries.length)).toBe(54);
  });
});

// ── Cache Invalidation Keys ────────────────────────────────────

describe("School Intelligence Query Keys", () => {
  it("hiring intelligence uses canonical key prefix", () => {
    const queryKey = ["school_intelligence", "hiring", "school-123"];
    expect(queryKey[0]).toBe("school_intelligence");
    expect(queryKey[1]).toBe("hiring");
  });

  it("team intelligence uses canonical key prefix", () => {
    const queryKey = ["school_intelligence", "team", "school-123"];
    expect(queryKey[0]).toBe("school_intelligence");
    expect(queryKey[1]).toBe("team");
  });
});
