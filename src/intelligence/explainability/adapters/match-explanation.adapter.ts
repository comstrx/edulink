/**
 * Match Explanation Adapter
 *
 * Transforms MatchConsumptionData → MatchExplanationDTO per audience.
 *
 * Phase 4.3 — Explainability Layer
 */

import type { MatchConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";
import type { MatchExplanationDTO, EvidencePoint } from "../types/explanation.types";
import { FALLBACK_EXPLANATION } from "../types/explanation.types";
import { clampEvidence } from "../utils/explanation-helpers";

export function explainMatch(
  data: MatchConsumptionData | null,
  audience: ExposureAudience,
): MatchExplanationDTO {
  if (!data) {
    return { ...FALLBACK_EXPLANATION, signal: "match", score: 0, confidence: "low" };
  }

  const { score, confidence, dimensions, matchedTermIds, unmatchedTermIds } = data;
  const strengths = dimensions.filter((d) => d.matched);
  const gaps = dimensions.filter((d) => !d.matched);

  const headline = score >= 70 ? "Strong job match" : score >= 50 ? "Partial job match" : "Limited job match";

  const shortDescription =
    audience === "teacher"
      ? score >= 70
        ? "Your profile aligns well with this role's requirements."
        : "There are some gaps between your profile and this role."
      : `${matchedTermIds.length} of ${matchedTermIds.length + unmatchedTermIds.length} requirements matched.`;

  const evidencePoints: EvidencePoint[] = [];

  // Both audiences see strengths
  for (const dim of strengths.slice(0, 3)) {
    evidencePoints.push({
      label: dim.label,
      detail: dim.reason || "Matches requirement",
      sentiment: "positive",
    });
  }

  // Gaps
  if (audience === "teacher" || audience === "admin") {
    for (const dim of gaps.slice(0, 2)) {
      evidencePoints.push({
        label: dim.label,
        detail: dim.reason || "Does not meet requirement",
        sentiment: "negative",
      });
    }
  } else if (audience === "school" && unmatchedTermIds.length > 0) {
    evidencePoints.push({
      label: "Unmatched requirements",
      detail: `${unmatchedTermIds.length} requirement${unmatchedTermIds.length !== 1 ? "s" : ""} not met`,
      sentiment: "neutral",
    });
  }

  const suggestion =
    audience === "teacher" && gaps.length > 0
      ? `Consider strengthening your ${gaps[0].label.toLowerCase()} to improve this match.`
      : null;

  return {
    signal: "match",
    score,
    confidence,
    headline,
    shortDescription,
    evidencePoints: clampEvidence(evidencePoints),
    suggestion,
  };
}
