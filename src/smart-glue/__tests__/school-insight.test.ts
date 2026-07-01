import { describe, it, expect } from "vitest";
import { resolveSchoolHiringHealth, buildSchoolHiringInsight } from "@/smart-glue/decision-engine-school";
import type { SchoolAggregatedContext } from "@/smart-glue/intelligence/school-context.reader";

const base: SchoolAggregatedContext = {
  schoolId: "school-001",
  available: true,
  hiring: { totalOpenJobs: 3, totalApplicants: 10, rejectionCount: 5, averageMatchScore: 35 },
  workforce: { totalTeachers: 10, averageCriScore: 45, lowReadinessCount: 2 },
  training: { activeAssignments: 5, completedTrainings: 8, teamTrainingCompletionRate: 0.6 },
  trust: { verifiedTeachersCount: 6, totalTeachersWithSnapshots: 10, verifiedTeachersRatio: 0.6, averageVerificationRatio: 0.7 },
};

describe("buildSchoolHiringInsight", () => {
  it("returns null when health result is not applied", () => {
    const result = resolveSchoolHiringHealth(undefined, "test-trace");
    const insight = buildSchoolHiringInsight(result, 0, null);
    expect(insight).toBeNull();
  });

  it("returns structured insight when quality gap detected", () => {
    const result = resolveSchoolHiringHealth(base, "test-trace");
    const insight = buildSchoolHiringInsight(result, 0.5, 35);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("hiring_quality_gap");
    expect(insight!.title).toBeTruthy();
    expect(insight!.description).toBeTruthy();
    expect(insight!.reasoning).toContain("50%");
    expect(insight!.reasoning).toContain("35%");
    expect(insight!.suggestedAction).toBeTruthy();
    expect(insight!.priority).toBe("high");
  });

  it("suggests training + filter when both flags are true", () => {
    const result = resolveSchoolHiringHealth(base, "test-trace");
    const insight = buildSchoolHiringInsight(result, 0.5, 35);
    expect(insight!.suggestedAction).toContain("training");
    expect(insight!.suggestedAction).toContain("readiness");
  });

  it("suggests training-only when only that flag is true", () => {
    const ctx = { ...base, workforce: { ...base.workforce, lowReadinessCount: 0 } };
    const result = resolveSchoolHiringHealth(ctx, "test-trace");
    const insight = buildSchoolHiringInsight(result, 0.5, 35);
    expect(insight!.suggestedAction).toContain("training");
    expect(insight!.suggestedAction).not.toContain("filter");
  });

  it("uses 'significantly' for critical priority", () => {
    const criticalCtx: SchoolAggregatedContext = {
      ...base,
      hiring: { totalOpenJobs: 6, totalApplicants: 20, rejectionCount: 14, averageMatchScore: 20 },
    };
    const result = resolveSchoolHiringHealth(criticalCtx, "test-trace");
    const insight = buildSchoolHiringInsight(result, 0.7, 20);
    expect(insight!.description).toContain("significantly");
    expect(insight!.priority).toBe("critical");
  });

  it("is deterministic", () => {
    const result = resolveSchoolHiringHealth(base, "test-trace");
    const i1 = buildSchoolHiringInsight(result, 0.5, 35);
    const i2 = buildSchoolHiringInsight(result, 0.5, 35);
    expect(i1).toEqual(i2);
  });
});
