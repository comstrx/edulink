/**
 * CRI Explanation Adapter
 *
 * Transforms CriConsumptionData → CriExplanationDTO per audience.
 * Never exposes raw scoring formulas.
 *
 * Phase 4.3 — Explainability Layer
 */

import type { CriConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";
import type { CriExplanationDTO, EvidencePoint } from "../types/explanation.types";
import { FALLBACK_EXPLANATION } from "../types/explanation.types";
import { clampEvidence } from "../utils/explanation-helpers";

export function explainCri(
  data: CriConsumptionData | null,
  audience: ExposureAudience,
): CriExplanationDTO {
  if (!data) {
    return { ...FALLBACK_EXPLANATION, signal: "cri", score: 0, band: "unknown" };
  }

  const { score, band, dimensions, gapTermIds } = data;
  const met = dimensions.filter((d) => d.met);
  const unmet = dimensions.filter((d) => !d.met);

  const headline = buildHeadline(score, band);
  const shortDescription = buildDescription(score, band, audience);
  const evidencePoints = buildEvidence(met, unmet, gapTermIds, audience);
  const suggestion = buildSuggestion(score, unmet, audience);

  return {
    signal: "cri",
    score,
    band,
    headline,
    shortDescription,
    evidencePoints: clampEvidence(evidencePoints),
    suggestion,
  };
}

function buildHeadline(score: number, band: string): string {
  if (score >= 80) return "Strong career readiness";
  if (score >= 60) return "Good progress on career readiness";
  if (score >= 40) return "Building your career readiness";
  return "Early stage career readiness";
}

function buildDescription(score: number, band: string, audience: ExposureAudience): string {
  if (audience === "school") {
    return `This candidate shows ${band.toLowerCase()} career readiness.`;
  }
  if (score >= 80) return "Your profile demonstrates strong qualifications across key areas.";
  if (score >= 60) return "You're making good progress. A few areas could strengthen your profile further.";
  if (score >= 40) return "Your profile is developing. Completing key credentials will improve your readiness.";
  return "You're at an early stage. Focus on building foundational credentials and experience.";
}

function buildEvidence(
  met: CriConsumptionData["dimensions"],
  unmet: CriConsumptionData["dimensions"],
  gapTermIds: string[],
  audience: ExposureAudience,
): EvidencePoint[] {
  const points: EvidencePoint[] = [];

  // Strengths
  for (const dim of met.slice(0, 2)) {
    points.push({
      label: dim.label,
      detail: audience === "school" ? "Meets expectations" : "Fully met — great work!",
      sentiment: "positive",
    });
  }

  // Teacher/admin sees improvement areas
  if (audience === "teacher" || audience === "admin") {
    for (const dim of unmet.slice(0, 2)) {
      const pct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
      points.push({
        label: dim.label,
        detail: `Currently at ${pct}% — room for improvement`,
        sentiment: "negative",
      });
    }
  }

  // School sees neutral gap count
  if (audience === "school" && gapTermIds.length > 0) {
    points.push({
      label: "Profile gaps",
      detail: `${gapTermIds.length} area${gapTermIds.length !== 1 ? "s" : ""} identified`,
      sentiment: "neutral",
    });
  }

  return points;
}

function buildSuggestion(
  score: number,
  unmet: CriConsumptionData["dimensions"],
  audience: ExposureAudience,
): string | null {
  if (audience === "school" || audience === "public") return null;
  if (score >= 80) return "Maintain your credentials and stay active to keep your readiness high.";
  if (unmet.length > 0) return `Focus on improving your ${unmet[0].label.toLowerCase()} to boost your score.`;
  return "Continue building your profile to improve your career readiness.";
}
