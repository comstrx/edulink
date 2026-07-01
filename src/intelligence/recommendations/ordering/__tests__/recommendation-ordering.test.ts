import { describe, it, expect } from "vitest";
import { orderRecommendationsByPriority } from "@/intelligence/recommendations/ordering/recommendation-ordering";
import type { RecommendationEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";

const makeRec = (overrides: Partial<RecommendationEntry> & { priority: RecommendationEntry["priority"]; rank: number }): RecommendationEntry => ({
  recommendationId: `rec-${overrides.rank}`,
  recommendationType: "course_recommendation",
  type: "training",
  itemId: `item-${overrides.rank}`,
  confidence: "medium",
  reason: "test",
  reasonCodes: [],
  actionLabelKey: "open_course",
  groupKey: "career_readiness_actions",
  addressesGapTermIds: [],
  relatedTaxonomyTermIds: [],
  ...overrides,
});

describe("orderRecommendationsByPriority", () => {
  it("returns empty array for empty input", () => {
    expect(orderRecommendationsByPriority([])).toEqual([]);
  });

  it("does not mutate original array", () => {
    const input = [makeRec({ priority: "low", rank: 1 })];
    const result = orderRecommendationsByPriority(input);
    expect(result).not.toBe(input);
  });

  it("orders by priority descending (critical > high > medium > low)", () => {
    const input = [
      makeRec({ priority: "low", rank: 1 }),
      makeRec({ priority: "critical", rank: 2 }),
      makeRec({ priority: "medium", rank: 3 }),
      makeRec({ priority: "high", rank: 4 }),
    ];
    const result = orderRecommendationsByPriority(input);
    expect(result.map((r) => r.priority)).toEqual(["critical", "high", "medium", "low"]);
  });

  it("uses rank as tie-breaker within same priority", () => {
    const input = [
      makeRec({ priority: "high", rank: 3 }),
      makeRec({ priority: "high", rank: 1 }),
      makeRec({ priority: "high", rank: 2 }),
    ];
    const result = orderRecommendationsByPriority(input);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("uses type as third tie-breaker (training > job)", () => {
    const a = makeRec({ priority: "medium", rank: 1, type: "job", recommendationId: "job-1" });
    const b = makeRec({ priority: "medium", rank: 1, type: "training", recommendationId: "train-1" });
    const result = orderRecommendationsByPriority([a, b]);
    expect(result[0].type).toBe("training");
    expect(result[1].type).toBe("job");
  });

  it("is deterministic — same input always same output", () => {
    const input = [
      makeRec({ priority: "low", rank: 2 }),
      makeRec({ priority: "high", rank: 1 }),
      makeRec({ priority: "medium", rank: 3 }),
    ];
    const r1 = orderRecommendationsByPriority(input);
    const r2 = orderRecommendationsByPriority(input);
    expect(r1).toEqual(r2);
  });

  it("preserves all items — no additions or removals", () => {
    const input = [
      makeRec({ priority: "low", rank: 1 }),
      makeRec({ priority: "critical", rank: 2 }),
    ];
    const result = orderRecommendationsByPriority(input);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.recommendationId).sort()).toEqual(["rec-1", "rec-2"]);
  });
});
