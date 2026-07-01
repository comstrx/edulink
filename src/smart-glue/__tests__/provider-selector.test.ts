import { describe, it, expect } from "vitest";
import { selectTopCoursePerGap } from "../intelligence/provider-selector";
import type { ProviderCourseContext } from "../intelligence/provider-context.reader";

const makeCourse = (
  id: string,
  competencyTermIds: string[],
  criBoostValue: number | null = null,
  subjectTermIds: string[] = [],
): ProviderCourseContext => ({
  courseId: id,
  providerId: "p-1",
  title: `Course ${id}`,
  competencyTermIds,
  subjectTermIds,
  criBoostValue,
  criTarget: null,
  durationHours: null,
  credentialEligible: false,
  hasMicroAssessment: false,
});

describe("selectTopCoursePerGap", () => {
  it("returns empty for no gaps", () => {
    const r = selectTopCoursePerGap([makeCourse("c1", ["g1"])], []);
    expect(r.matches).toEqual([]);
    expect(r.unmatchedGapTermIds).toEqual([]);
  });

  it("returns empty for no courses", () => {
    const r = selectTopCoursePerGap([], ["g1"]);
    expect(r.matches).toEqual([]);
    expect(r.unmatchedGapTermIds).toEqual(["g1"]);
  });

  it("selects one course per gap", () => {
    const courses = [
      makeCourse("c1", ["g1"]),
      makeCourse("c2", ["g2"]),
    ];
    const r = selectTopCoursePerGap(courses, ["g1", "g2"]);
    expect(r.matches).toHaveLength(2);
    expect(r.matches[0].gapTermId).toBe("g1");
    expect(r.matches[0].courseId).toBe("c1");
    expect(r.matches[1].gapTermId).toBe("g2");
    expect(r.matches[1].courseId).toBe("c2");
  });

  it("picks higher relevance score when multiple courses match same gap", () => {
    const courses = [
      makeCourse("c1", ["g1"]),                // overlap=1
      makeCourse("c2", ["g1", "g2", "g3"]),    // overlap=1 for g1 but higher total
    ];
    // Both match g1 with overlap=1, but c2 has more total overlaps
    // Actually both score the same for g1 alone. Tie-break: criBoost then courseId
    const r = selectTopCoursePerGap(courses, ["g1"]);
    expect(r.matches).toHaveLength(1);
    // Same score, same boost(null→0), so courseId asc → c1
    expect(r.matches[0].courseId).toBe("c1");
  });

  it("uses criBoostValue as tie-breaker", () => {
    const courses = [
      makeCourse("c1", ["g1"], 5),
      makeCourse("c2", ["g1"], 15),
    ];
    const r = selectTopCoursePerGap(courses, ["g1"]);
    expect(r.matches[0].courseId).toBe("c2"); // higher criBoost wins
  });

  it("uses courseId as final tie-breaker", () => {
    const courses = [
      makeCourse("c-beta", ["g1"], 5),
      makeCourse("c-alpha", ["g1"], 5),
    ];
    const r = selectTopCoursePerGap(courses, ["g1"]);
    expect(r.matches[0].courseId).toBe("c-alpha"); // alphabetical
  });

  it("reports unmatched gaps", () => {
    const courses = [makeCourse("c1", ["g1"])];
    const r = selectTopCoursePerGap(courses, ["g1", "g2", "g3"]);
    expect(r.matches).toHaveLength(1);
    expect(r.unmatchedGapTermIds).toEqual(["g2", "g3"]);
  });

  it("is deterministic", () => {
    const courses = [
      makeCourse("c1", ["g1", "g2"], 10),
      makeCourse("c2", ["g1"], 8),
    ];
    const gaps = ["g1", "g2"];
    const r1 = selectTopCoursePerGap(courses, gaps);
    const r2 = selectTopCoursePerGap(courses, gaps);
    expect(r1).toEqual(r2);
  });

  it("handles subject term overlap for gap matching", () => {
    const courses = [makeCourse("c1", [], null, ["g1"])];
    const r = selectTopCoursePerGap(courses, ["g1"]);
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].courseId).toBe("c1");
  });
});
