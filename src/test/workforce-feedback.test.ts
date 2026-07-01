/**
 * Workforce Feedback Service — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { analyzeWorkforceFeedback } from "@/workforce/engine/workforce-feedback.service";
import type { SchoolWorkforceProfile, DepartmentCapability, PromotionReadinessEntry } from "@/workforce/types/workforce.types";

function makeProfile(overrides: Partial<SchoolWorkforceProfile> = {}): SchoolWorkforceProfile {
  return {
    schoolId: "school-1",
    teacherCount: 5,
    verifiedTeacherCount: 2,
    averageReputationScore: 30,
    averageCriScore: 40,
    credentialCoverage: 50,
    careerStageDistribution: {},
    reputationDistribution: {},
    topGaps: [],
    promotionReadyCount: 0,
    workforceUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("analyzeWorkforceFeedback", () => {
  it("returns empty actions when no gaps and no promotion pipeline", () => {
    const profile = makeProfile();
    const result = analyzeWorkforceFeedback(profile, [], [], ["t1", "t2"]);
    expect(result).toHaveLength(0);
  });

  it("emits growth_refresh for all teachers when critical gaps exist", () => {
    const profile = makeProfile({
      topGaps: [
        {
          gapType: "low_credential_coverage",
          severity: "critical",
          description: "Only 5% of teachers hold credentials",
          recommendedIntervention: "Assign training",
        },
      ],
    });

    const result = analyzeWorkforceFeedback(profile, [], [], ["t1", "t2", "t3"]);
    const growthActions = result.filter((a) => a.actionType === "growth_refresh");
    expect(growthActions).toHaveLength(3);
    expect(growthActions[0].severity).toBe("critical");
    expect(growthActions[0].reason).toContain("Only 5%");
  });

  it("emits training_recommendation for high-gap departments", () => {
    const depts: DepartmentCapability[] = [
      {
        departmentKey: "math",
        departmentLabel: "Mathematics",
        teacherCount: 3,
        averageReputationScore: 15,
        averageCriScore: 20,
        verifiedCount: 0,
        credentialCoverage: 10,
        stageDistribution: {},
        gapScore: 85,
      },
    ];

    const result = analyzeWorkforceFeedback(makeProfile(), depts, [], []);
    const deptActions = result.filter((a) => a.actionType === "training_recommendation");
    expect(deptActions).toHaveLength(1);
    expect(deptActions[0].reason).toContain("Mathematics");
    expect(deptActions[0].severity).toBe("critical");
  });

  it("emits growth_refresh for promotion-ready teachers", () => {
    const pipeline: PromotionReadinessEntry[] = [
      {
        teacherId: "t1",
        readinessPercent: 80,
        nextStage: "Senior",
        gapCount: 0,
        blockingGaps: [],
      },
    ];

    const result = analyzeWorkforceFeedback(makeProfile(), [], pipeline, []);
    const promoActions = result.filter(
      (a) => a.actionType === "growth_refresh" && a.teacherId === "t1",
    );
    expect(promoActions).toHaveLength(1);
    expect(promoActions[0].reason).toContain("Promotion ready");
  });

  it("emits growth_refresh for teachers with blocking gaps", () => {
    const pipeline: PromotionReadinessEntry[] = [
      {
        teacherId: "t2",
        readinessPercent: 40,
        nextStage: "Lead",
        gapCount: 3,
        blockingGaps: [{ key: "g1", label: "Missing cert" }],
      },
    ];

    const result = analyzeWorkforceFeedback(makeProfile(), [], pipeline, []);
    const blockingActions = result.filter(
      (a) => a.actionType === "growth_refresh" && a.teacherId === "t2",
    );
    expect(blockingActions).toHaveLength(1);
    expect(blockingActions[0].reason).toContain("3 blocking gaps");
  });

  it("deduplicates teacher actions", () => {
    const profile = makeProfile({
      topGaps: [
        {
          gapType: "low_credential_coverage",
          severity: "high",
          description: "Low coverage",
        },
      ],
    });
    const pipeline: PromotionReadinessEntry[] = [
      {
        teacherId: "t1",
        readinessPercent: 80,
        nextStage: "Senior",
        gapCount: 0,
        blockingGaps: [],
      },
    ];

    const result = analyzeWorkforceFeedback(profile, [], pipeline, ["t1"]);
    const t1Actions = result.filter((a) => a.teacherId === "t1");
    // t1 should only appear once (from gap, not duplicated by promotion)
    expect(t1Actions).toHaveLength(1);
  });
});
