import { describe, it, expect } from "vitest";
import { resolveSchoolHiringHealth } from "@/smart-glue/decision-engine-school";
import type { SchoolAggregatedContext } from "@/smart-glue/intelligence/school-context.reader";

const base: SchoolAggregatedContext = {
  schoolId: "school-001",
  available: true,
  hiring: { totalOpenJobs: 3, totalApplicants: 10, rejectionCount: 5, averageMatchScore: 35 },
  workforce: { totalTeachers: 10, averageCriScore: 45, lowReadinessCount: 2 },
  training: { activeAssignments: 5, completedTrainings: 8, teamTrainingCompletionRate: 0.6 },
  trust: { verifiedTeachersCount: 6, totalTeachersWithSnapshots: 10, verifiedTeachersRatio: 0.6, averageVerificationRatio: 0.7 },
};

describe("resolveSchoolHiringHealth", () => {
  // ── No-op cases ───────────────────────────────────────────

  it("returns no-op when context unavailable", () => {
    const r = resolveSchoolHiringHealth(undefined, "test-trace");
    expect(r.applied).toBe(false);
  });

  it("returns no-op when not enough applicants", () => {
    const ctx = { ...base, hiring: { ...base.hiring, totalApplicants: 2 } };
    const r = resolveSchoolHiringHealth(ctx, "test-trace");
    expect(r.applied).toBe(false);
  });

  it("returns no-op when rejection rate is low", () => {
    const ctx = { ...base, hiring: { ...base.hiring, rejectionCount: 1 } };
    const r = resolveSchoolHiringHealth(ctx, "test-trace");
    expect(r.applied).toBe(false);
  });

  it("returns no-op when match score is high", () => {
    const ctx = { ...base, hiring: { ...base.hiring, averageMatchScore: 70 } };
    const r = resolveSchoolHiringHealth(ctx, "test-trace");
    expect(r.applied).toBe(false);
  });

  // ── Active: quality gap ───────────────────────────────────

  it("detects quality gap with high rejection + low match → high priority", () => {
    const r = resolveSchoolHiringHealth(base, "test-trace");
    expect(r.applied).toBe(true);
    expect(r.diagnosis).toBe("quality_gap");
    expect(r.priority).toBe("high");
  });

  it("escalates to critical when rejection very high + match very low + many jobs", () => {
    const ctx: SchoolAggregatedContext = {
      ...base,
      hiring: { totalOpenJobs: 6, totalApplicants: 20, rejectionCount: 14, averageMatchScore: 20 },
    };
    const r = resolveSchoolHiringHealth(ctx, "test-trace");
    expect(r.applied).toBe(true);
    expect(r.priority).toBe("critical");
  });

  it("stays high when signals are moderate", () => {
    // rejection 50%, match 35, 2 jobs → severity = 1+1+0 = 2 → high
    const ctx: SchoolAggregatedContext = {
      ...base,
      hiring: { totalOpenJobs: 2, totalApplicants: 10, rejectionCount: 5, averageMatchScore: 35 },
    };
    const r = resolveSchoolHiringHealth(ctx, "test-trace");
    expect(r.priority).toBe("high");
  });

  it("recommends training-first when CRI < 50", () => {
    const r = resolveSchoolHiringHealth(base, "test-trace");
    expect(r.shouldRecommendTrainingFirst).toBe(true);
  });

  it("does NOT recommend training-first when CRI >= 50", () => {
    const ctx = { ...base, workforce: { ...base.workforce, averageCriScore: 55 } };
    const r = resolveSchoolHiringHealth(ctx, "test-trace");
    expect(r.applied).toBe(true);
    expect(r.shouldRecommendTrainingFirst).toBe(false);
  });

  it("recommends readiness filter when low-readiness depts exist", () => {
    const r = resolveSchoolHiringHealth(base, "test-trace");
    expect(r.shouldRecommendReadinessFilter).toBe(true);
  });

  it("does NOT recommend readiness filter when no low depts", () => {
    const ctx = { ...base, workforce: { ...base.workforce, lowReadinessCount: 0 } };
    const r = resolveSchoolHiringHealth(ctx, "test-trace");
    expect(r.shouldRecommendReadinessFilter).toBe(false);
  });

  // ── Determinism ───────────────────────────────────────────

  it("same inputs produce identical output", () => {
    const r1 = resolveSchoolHiringHealth(base, "test-trace");
    const r2 = resolveSchoolHiringHealth(base, "test-trace");
    expect(r1).toEqual(r2);
  });
});
