/**
 * Recommendation Exposure Adapter
 *
 * Transforms RecommendationConsumptionData into audience-scoped DTOs.
 * Full: teacher/admin — all recommendation details.
 * Summary: school — aggregate counts and areas only.
 *
 * Phase 4A → Sprint 5 — Intelligence Governance
 */

import type { RecommendationConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type {
  ExposureAudience,
  RecommendationExposed,
  RecommendationExposedFull,
  RecommendationExposedSummary,
  ExposedHidden,
} from "../types/exposure.types";
import { getExposureLevel } from "../rules/exposure-rules";

export function exposeRecommendation(
  data: RecommendationConsumptionData | null,
  audience: ExposureAudience,
): RecommendationExposed {
  const level = getExposureLevel("recommendation", audience);

  if (level === "hidden" || !data) {
    return { level: "hidden" } as ExposedHidden;
  }

  if (level === "summary") {
    // School-safe: aggregate counts only, no personal details
    const areaCounts = new Map<string, number>();
    for (const r of data.recommendations) {
      const key = r.type ?? "general";
      areaCounts.set(key, (areaCounts.get(key) ?? 0) + 1);
    }
    return {
      level: "summary",
      totalCount: data.totalCount,
      groupedAreas: Array.from(areaCounts.entries())
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count),
    } as RecommendationExposedSummary;
  }

  // Full level — teacher/admin
  return {
    level: "full",
    totalCount: data.totalCount,
    recommendations: data.recommendations.map((r) => ({
      recommendationId: r.recommendationId,
      type: r.type,
      priority: r.priority,
      actionLabelKey: r.actionLabelKey,
      reasonCodes: r.reasonCodes,
      relatedGapIds: r.relatedGapIds,
    })),
  } as RecommendationExposedFull;
}
