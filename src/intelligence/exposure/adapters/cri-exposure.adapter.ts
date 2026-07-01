/**
 * CRI Exposure Adapter
 *
 * Transforms CriConsumptionData into audience-scoped CriExposed DTOs.
 *
 * Phase 4A — Intelligence Governance
 */

import type { CriConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience, CriExposed, CriExposedFull, CriExposedSummary, ExposedHidden } from "../types/exposure.types";
import { getExposureLevel } from "../rules/exposure-rules";

function scoreToBandLabel(score: number): string {
  if (score >= 80) return "80–100";
  if (score >= 60) return "60–79";
  if (score >= 40) return "40–59";
  return "0–39";
}

export function exposeCri(
  data: CriConsumptionData | null,
  audience: ExposureAudience,
): CriExposed {
  const level = getExposureLevel("cri", audience);

  if (level === "hidden" || !data) {
    return { level: "hidden" } as ExposedHidden;
  }

  if (level === "full") {
    return {
      level: "full",
      score: data.score,
      band: data.band,
      dimensions: data.dimensions,
      gapTermIds: data.gapTermIds,
    } as CriExposedFull;
  }

  // summary — banded score only
  return {
    level: "summary",
    band: data.band,
    scoreBand: scoreToBandLabel(data.score),
  } as CriExposedSummary;
}
