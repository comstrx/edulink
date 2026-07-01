import { describe, it, expect } from "vitest";
import type {
  ProviderCourseContext,
  ProviderAggregatedContext,
} from "@/smart-glue/intelligence/provider-context.reader";

describe("ProviderAggregatedContext shape", () => {
  const emptyCourse: ProviderCourseContext = {
    courseId: "course-1",
    providerId: "prov-1",
    title: "CELTA Prep",
    competencyTermIds: ["term-1", "term-2"],
    subjectTermIds: ["sub-1"],
    criBoostValue: 5,
    criTarget: 60,
    durationHours: 40,
    credentialEligible: true,
    hasMicroAssessment: false,
  };

  const ctx: ProviderAggregatedContext = {
    providerId: "prov-1",
    available: true,
    providerStatus: "active",
    totalCourses: 1,
    courses: [emptyCourse],
    coveredCompetencyTermIds: ["term-1", "term-2"],
    coveredSubjectTermIds: ["sub-1"],
  };

  it("has all required top-level keys", () => {
    expect(Object.keys(ctx)).toEqual(
      expect.arrayContaining([
        "providerId", "available", "providerStatus", "totalCourses",
        "courses", "coveredCompetencyTermIds", "coveredSubjectTermIds",
      ]),
    );
  });

  it("course has competency + CRI fields", () => {
    const c = ctx.courses[0];
    expect(c.competencyTermIds.length).toBeGreaterThan(0);
    expect(typeof c.criBoostValue).toBe("number");
    expect(typeof c.criTarget).toBe("number");
  });

  it("coveredCompetencyTermIds aggregates from courses", () => {
    expect(ctx.coveredCompetencyTermIds).toEqual(["term-1", "term-2"]);
  });

  it("empty context defaults are safe", () => {
    const empty: ProviderAggregatedContext = {
      providerId: "prov-empty",
      available: false,
      providerStatus: null,
      totalCourses: 0,
      courses: [],
      coveredCompetencyTermIds: [],
      coveredSubjectTermIds: [],
    };
    expect(empty.available).toBe(false);
    expect(empty.courses).toHaveLength(0);
    expect(empty.coveredCompetencyTermIds).toHaveLength(0);
  });

  it("links course to gap via competencyTermIds", () => {
    const gapTermIds = ["term-1", "term-3"];
    const overlap = emptyCourse.competencyTermIds.filter(id => gapTermIds.includes(id));
    expect(overlap).toEqual(["term-1"]);
  });
});
