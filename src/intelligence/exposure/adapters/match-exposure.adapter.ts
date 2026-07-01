/**
 * Match Exposure Adapter
 *
 * Transforms MatchConsumptionData into audience-scoped MatchExposed DTOs.
 *
 * Phase 4A — Intelligence Governance
 */

import type { MatchConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience, MatchExposed, MatchExposedFull, MatchExposedSummary, ExposedHidden } from "../types/exposure.types";
import { getExposureLevel } from "../rules/exposure-rules";

export function exposeMatch(
  data: MatchConsumptionData | null,
  audience: ExposureAudience,
): MatchExposed {
  const level = getExposureLevel("match", audience);

  if (level === "hidden" || !data) {
    return { level: "hidden" } as ExposedHidden;
  }

  if (level === "full") {
    return {
      level: "full",
      score: data.score,
      confidence: data.confidence,
      dimensions: data.dimensions,
    } as MatchExposedFull;
  }

  // summary — teacher sees strengths/gaps but not full dimension scores
  const strengths = data.dimensions
    .filter((d) => d.matched)
    .map((d) => d.label);
  const gaps = data.dimensions
    .filter((d) => !d.matched)
    .map((d) => d.label);

  return {
    level: "summary",
    score: data.score,
    strengths,
    gaps,
  } as MatchExposedSummary;
}
