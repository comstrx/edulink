/**
 * Gap Explanation Adapter
 *
 * Transforms GapConsumptionData → GapExplanationDTO per audience.
 *
 * Phase 4.3 — Explainability Layer
 */

import type { GapConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";
import type { GapExplanationDTO, EvidencePoint } from "../types/explanation.types";
import { FALLBACK_EXPLANATION } from "../types/explanation.types";
import { clampEvidence } from "../utils/explanation-helpers";

export function explainGap(
  data: GapConsumptionData | null,
  audience: ExposureAudience,
): GapExplanationDTO {
  if (!data) {
    return { ...FALLBACK_EXPLANATION, signal: "gap", totalGaps: 0 };
  }

  const { gaps, totalGaps, groupedSummary } = data;

  if (totalGaps === 0) {
    return {
      signal: "gap",
      totalGaps: 0,
      headline: "No gaps identified",
      shortDescription: "Your profile covers all expected areas.",
      evidencePoints: [],
      suggestion: null,
    };
  }

  const headline =
    totalGaps === 1 ? "1 area for improvement" : `${totalGaps} areas for improvement`;

  const shortDescription =
    audience === "teacher"
      ? "These gaps represent areas where your profile could be strengthened."
      : audience === "school"
        ? `This candidate has ${totalGaps} identified gap${totalGaps !== 1 ? "s" : ""}.`
        : `${totalGaps} gap${totalGaps !== 1 ? "s" : ""} identified.`;

  const evidencePoints: EvidencePoint[] = [];

  if (audience === "teacher" || audience === "admin") {
    // Teacher sees specific gaps
    for (const gap of gaps.slice(0, 4)) {
      evidencePoints.push({
        label: gap.label,
        detail: `${gap.category} gap — ${gap.severity} severity`,
        sentiment: gap.severity === "critical" || gap.severity === "high" ? "negative" : "neutral",
      });
    }
  } else if (audience === "school") {
    // School sees category-level summary only
    for (const group of groupedSummary.slice(0, 3)) {
      evidencePoints.push({
        label: group.category.replace(/\b\w/g, (c) => c.toUpperCase()),
        detail: `${group.count} gap${group.count !== 1 ? "s" : ""}`,
        sentiment: "neutral",
      });
    }
  }

  const suggestion =
    audience === "teacher" && gaps.length > 0
      ? `Start by addressing your ${gaps[0].category} gaps to improve your readiness.`
      : null;

  return {
    signal: "gap",
    totalGaps,
    headline,
    shortDescription,
    evidencePoints: clampEvidence(evidencePoints),
    suggestion,
  };
}
