/**
 * Sprint 4.4 Step 1 — School Context Shape Tests
 *
 * Validates the interface structure and default values.
 * DB reads are covered by integration tests; here we test the shape contract.
 */

import { describe, it, expect } from "vitest";
import type { SchoolAggregatedContext } from "@/smart-glue/intelligence/school-context.reader";

describe("SchoolAggregatedContext shape", () => {
  const empty: SchoolAggregatedContext = {
    schoolId: "school-001",
    available: false,
    hiring: { totalOpenJobs: 0, totalApplicants: 0, rejectionCount: 0, averageMatchScore: null },
    workforce: { totalTeachers: 0, averageCriScore: null, lowReadinessCount: 0 },
    training: { activeAssignments: 0, completedTrainings: 0, teamTrainingCompletionRate: 0 },
    trust: { verifiedTeachersCount: 0, totalTeachersWithSnapshots: 0, verifiedTeachersRatio: 0, averageVerificationRatio: 0 },
  };

  it("has all required sections", () => {
    expect(Object.keys(empty)).toEqual(
      expect.arrayContaining(["schoolId", "available", "hiring", "workforce", "training", "trust"]),
    );
  });

  it("hiring section has correct keys", () => {
    expect(Object.keys(empty.hiring)).toEqual(
      expect.arrayContaining(["totalOpenJobs", "totalApplicants", "rejectionCount", "averageMatchScore"]),
    );
  });

  it("workforce section has correct keys", () => {
    expect(Object.keys(empty.workforce)).toEqual(
      expect.arrayContaining(["totalTeachers", "averageCriScore", "lowReadinessCount"]),
    );
  });

  it("training section has correct keys", () => {
    expect(Object.keys(empty.training)).toEqual(
      expect.arrayContaining(["activeAssignments", "completedTrainings", "teamTrainingCompletionRate"]),
    );
  });

  it("trust section has correct keys", () => {
    expect(Object.keys(empty.trust)).toEqual(
      expect.arrayContaining(["verifiedTeachersCount", "totalTeachersWithSnapshots", "verifiedTeachersRatio", "averageVerificationRatio"]),
    );
  });

  it("defaults are numeric/null (no labels)", () => {
    expect(typeof empty.hiring.totalOpenJobs).toBe("number");
    expect(typeof empty.workforce.totalTeachers).toBe("number");
    expect(empty.workforce.averageCriScore).toBeNull();
    expect(typeof empty.training.teamTrainingCompletionRate).toBe("number");
    expect(typeof empty.trust.verifiedTeachersRatio).toBe("number");
  });

  it("populated context uses numeric values", () => {
    const populated: SchoolAggregatedContext = {
      schoolId: "school-002",
      available: true,
      hiring: { totalOpenJobs: 5, totalApplicants: 30, rejectionCount: 8, averageMatchScore: 72.5 },
      workforce: { totalTeachers: 15, averageCriScore: 58.3, lowReadinessCount: 3 },
      training: { activeAssignments: 10, completedTrainings: 25, teamTrainingCompletionRate: 0.71 },
      trust: { verifiedTeachersCount: 10, totalTeachersWithSnapshots: 14, verifiedTeachersRatio: 0.71, averageVerificationRatio: 0.85 },
    };
    expect(populated.available).toBe(true);
    expect(populated.hiring.averageMatchScore).toBe(72.5);
    expect(populated.workforce.averageCriScore).toBe(58.3);
    expect(populated.training.teamTrainingCompletionRate).toBe(0.71);
    expect(populated.trust.verifiedTeachersRatio).toBe(0.71);
  });
});
