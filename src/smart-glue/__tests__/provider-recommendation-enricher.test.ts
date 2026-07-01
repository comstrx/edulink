import { describe, it, expect } from "vitest";
import { enrichRecommendationsWithProvider } from "../intelligence/provider-recommendation-enricher";
import type { RecommendationEntry, GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { ProviderCourseContext } from "../intelligence/provider-context.reader";

const makeRec = (overrides: Partial<RecommendationEntry> = {}): RecommendationEntry => ({
  recommendationId: "rec-1",
  recommendationType: "course_recommendation",
  type: "training",
  itemId: "item-1",
  priority: "medium",
  confidence: "medium",
  reason: "Generic training recommendation",
  reasonCodes: ["addresses_gaps"],
  actionLabelKey: "course_recommendation",
  groupKey: "training_actions",
  rank: 1,
  addressesGapTermIds: [],
  relatedTaxonomyTermIds: [],
  ...overrides,
});

const makeCourse = (
  id: string,
  competencyTermIds: string[],
  criBoostValue: number | null = null,
): ProviderCourseContext => ({
  courseId: id,
  providerId: "prov-1",
  title: `Course ${id}`,
  competencyTermIds,
  subjectTermIds: [],
  criBoostValue,
  criTarget: null,
  durationHours: null,
  credentialEligible: false,
  hasMicroAssessment: false,
});

const makeGap = (termId: string, label: string): GapEntry => ({
  termId,
  label,
  category: "skill",
  source: "job_requirement",
  severity: "high",
});

describe("enrichRecommendationsWithProvider", () => {
  it("passes through non-training recommendations unchanged", () => {
    const recs = [makeRec({ type: "job", recommendationId: "job-1" })];
    const result = enrichRecommendationsWithProvider(recs, [], []);
    expect(result).toHaveLength(1);
    expect(result[0].providerTarget).toBeNull();
    expect(result[0].recommendation.type).toBe("job");
  });

  it("returns null providerTarget when no courses match", () => {
    const recs = [makeRec({ addressesGapTermIds: ["g1"] })];
    const courses = [makeCourse("c1", ["other"])];
    const result = enrichRecommendationsWithProvider(recs, courses, []);
    expect(result[0].providerTarget).toBeNull();
  });

  it("attaches provider target when course matches gap", () => {
    const recs = [makeRec({ addressesGapTermIds: ["g1"] })];
    const courses = [makeCourse("c1", ["g1"], 10)];
    const gaps = [makeGap("g1", "Classroom Management")];
    const result = enrichRecommendationsWithProvider(recs, courses, gaps);

    expect(result[0].providerTarget).not.toBeNull();
    expect(result[0].providerTarget!.targetCourseId).toBe("c1");
    expect(result[0].providerTarget!.providerId).toBe("prov-1");
    expect(result[0].providerTarget!.criBoostValue).toBe(10);
  });

  it("refines reason with gap label and CRI boost", () => {
    const recs = [makeRec({ addressesGapTermIds: ["g1"] })];
    const courses = [makeCourse("c1", ["g1"], 8)];
    const gaps = [makeGap("g1", "Classroom Management")];
    const result = enrichRecommendationsWithProvider(recs, courses, gaps);

    expect(result[0].refinedReason).toContain("Classroom Management");
    expect(result[0].refinedReason).toContain("boosts readiness by 8 points");
  });

  it("picks highest relevance course when multiple match same gap", () => {
    const recs = [makeRec({ addressesGapTermIds: ["g1"] })];
    const courses = [
      makeCourse("c-low", ["g1"], 2),
      makeCourse("c-high", ["g1"], 15),
    ];
    const result = enrichRecommendationsWithProvider(recs, courses, []);
    expect(result[0].providerTarget!.targetCourseId).toBe("c-high");
  });

  it("is deterministic — same input → same output", () => {
    const recs = [makeRec({ addressesGapTermIds: ["g1", "g2"] })];
    const courses = [
      makeCourse("c1", ["g1"], 5),
      makeCourse("c2", ["g2"], 10),
    ];
    const gaps = [makeGap("g1", "A"), makeGap("g2", "B")];
    const r1 = enrichRecommendationsWithProvider(recs, courses, gaps);
    const r2 = enrichRecommendationsWithProvider(recs, courses, gaps);
    expect(r1).toEqual(r2);
  });

  it("does not modify the original recommendation object", () => {
    const rec = makeRec({ addressesGapTermIds: ["g1"] });
    const courses = [makeCourse("c1", ["g1"], 5)];
    const result = enrichRecommendationsWithProvider([rec], courses, []);
    expect(result[0].recommendation).toBe(rec); // same reference
    expect(result[0].recommendation.type).toBe("training"); // unchanged
  });
});
