/**
 * Recommendation Explanation Adapter
 *
 * Transforms RecommendationConsumptionData → RecommendationExplanationDTO.
 * Recommendations are teacher-only; school/public get fallback.
 *
 * Phase 4.3 — Explainability Layer
 */

import type { RecommendationConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";
import type { RecommendationExplanationDTO, EvidencePoint } from "../types/explanation.types";
import { FALLBACK_EXPLANATION } from "../types/explanation.types";
import { clampEvidence, formatCode } from "../utils/explanation-helpers";

export function explainRecommendation(
  data: RecommendationConsumptionData | null,
  audience: ExposureAudience,
): RecommendationExplanationDTO {
  if (!data || (audience !== "teacher" && audience !== "admin")) {
    return { ...FALLBACK_EXPLANATION, signal: "recommendation", totalCount: 0 };
  }

  const { recommendations, totalCount, groupedSummary } = data;

  if (totalCount === 0) {
    return {
      signal: "recommendation",
      totalCount: 0,
      headline: "No recommendations right now",
      shortDescription: "Your profile is well-rounded. Keep your credentials up to date.",
      evidencePoints: [],
      suggestion: null,
    };
  }

  const critical = recommendations.filter((r) => r.priority === "critical" || r.priority === "high");
  const headline = critical.length > 0
    ? `${critical.length} priority action${critical.length !== 1 ? "s" : ""} recommended`
    : `${totalCount} action${totalCount !== 1 ? "s" : ""} to boost your career`;

  const shortDescription = "Personalized actions based on your profile gaps and career goals.";

  const evidencePoints: EvidencePoint[] = [];
  for (const rec of recommendations.slice(0, 3)) {
    evidencePoints.push({
      label: formatCode(rec.actionLabelKey),
      detail: rec.reasonCodes.length > 0
        ? formatCode(rec.reasonCodes[0])
        : "Recommended based on your profile",
      sentiment: rec.priority === "critical" || rec.priority === "high" ? "negative" : "neutral",
    });
  }

  // Group summary as additional context
  if (groupedSummary.length > 0 && evidencePoints.length < 5) {
    for (const group of groupedSummary.slice(0, 2)) {
      if (evidencePoints.length >= 5) break;
      evidencePoints.push({
        label: formatCode(group.groupKey),
        detail: `${group.count} action${group.count !== 1 ? "s" : ""} available`,
        sentiment: "neutral",
      });
    }
  }

  const suggestion = critical.length > 0
    ? `Start with your highest-priority action: ${formatCode(critical[0].actionLabelKey)}.`
    : "Work through these actions at your own pace to improve your readiness.";

  return {
    signal: "recommendation",
    totalCount,
    headline,
    shortDescription,
    evidencePoints: clampEvidence(evidencePoints),
    suggestion,
  };
}
