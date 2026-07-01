import { describe, it, expect } from "vitest";
import {
  scoreCourseRelevance,
  scoreCourses,
  type CourseRelevanceResult,
} from "../intelligence/provider-relevance.scorer";
import type { ProviderCourseContext } from "../intelligence/provider-context.reader";

const makeCourse = (
  overrides: Partial<ProviderCourseContext> = {},
): ProviderCourseContext => ({
  courseId: "c-1",
  providerId: "p-1",
  title: "Test Course",
  competencyTermIds: [],
  subjectTermIds: [],
  criBoostValue: null,
  criTarget: null,
  durationHours: null,
  credentialEligible: false,
  hasMicroAssessment: false,
  ...overrides,
});

describe("scoreCourseRelevance", () => {
  it("returns 0 score when no gap overlap and no CRI boost", () => {
    const r = scoreCourseRelevance(makeCourse(), []);
    expect(r.relevanceScore).toBe(0);
    expect(r.gapOverlapCount).toBe(0);
    expect(r.matchedGapTermIds).toEqual([]);
  });

  it("scores higher with gap overlap", () => {
    const r = scoreCourseRelevance(
      makeCourse({ competencyTermIds: ["g1", "g2", "other"] }),
      ["g1", "g2", "g3"],
    );
    expect(r.gapOverlapCount).toBe(2);
    expect(r.matchedGapTermIds).toEqual(["g1", "g2"]);
    expect(r.relevanceScore).toBe(20); // 2 * 10
  });

  it("includes subject term overlap", () => {
    const r = scoreCourseRelevance(
      makeCourse({ subjectTermIds: ["s1"] }),
      ["s1"],
    );
    expect(r.gapOverlapCount).toBe(1);
    expect(r.matchedGapTermIds).toEqual(["s1"]);
  });

  it("does not double-count terms in both competency and subject", () => {
    const r = scoreCourseRelevance(
      makeCourse({ competencyTermIds: ["t1"], subjectTermIds: ["t1"] }),
      ["t1"],
    );
    expect(r.gapOverlapCount).toBe(1);
  });

  it("scores higher with CRI boost", () => {
    const noBoost = scoreCourseRelevance(makeCourse({ criBoostValue: 0 }), []);
    const withBoost = scoreCourseRelevance(makeCourse({ criBoostValue: 10 }), []);
    expect(withBoost.relevanceScore).toBeGreaterThan(noBoost.relevanceScore);
    expect(withBoost.criBoostContribution).toBe(0.5); // 10/20
  });

  it("caps CRI boost contribution at 1", () => {
    const r = scoreCourseRelevance(makeCourse({ criBoostValue: 50 }), []);
    expect(r.criBoostContribution).toBe(1);
    expect(r.relevanceScore).toBe(5); // 1 * 5
  });

  it("combines gap overlap + CRI boost", () => {
    const r = scoreCourseRelevance(
      makeCourse({ competencyTermIds: ["g1"], criBoostValue: 20 }),
      ["g1"],
    );
    // 1*10 + 1*5 = 15
    expect(r.relevanceScore).toBe(15);
  });

  it("is deterministic — same input → same output", () => {
    const course = makeCourse({ competencyTermIds: ["a", "b"], criBoostValue: 8 });
    const gaps = ["a", "c"];
    const r1 = scoreCourseRelevance(course, gaps);
    const r2 = scoreCourseRelevance(course, gaps);
    expect(r1).toEqual(r2);
  });
});

describe("scoreCourses (batch)", () => {
  it("scores multiple courses without sorting", () => {
    const courses = [
      makeCourse({ courseId: "low", competencyTermIds: [] }),
      makeCourse({ courseId: "high", competencyTermIds: ["g1", "g2"] }),
    ];
    const results = scoreCourses(courses, ["g1", "g2"]);
    expect(results).toHaveLength(2);
    // Order preserved — no sorting
    expect(results[0].courseId).toBe("low");
    expect(results[1].courseId).toBe("high");
    expect(results[1].relevanceScore).toBeGreaterThan(results[0].relevanceScore);
  });
});
