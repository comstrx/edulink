/**
 * Gap Exposure Adapter
 *
 * Transforms GapConsumptionData into audience-scoped GapExposed DTOs.
 *
 * Phase 4A — Intelligence Governance
 */

import type { GapConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience, GapExposed, GapExposedFull, GapExposedSummary, ExposedHidden } from "../types/exposure.types";
import { getExposureLevel } from "../rules/exposure-rules";

export function exposeGap(
  data: GapConsumptionData | null,
  audience: ExposureAudience,
): GapExposed {
  const level = getExposureLevel("gap", audience);

  if (level === "hidden" || !data) {
    return { level: "hidden" } as ExposedHidden;
  }

  if (level === "full") {
    return {
      level: "full",
      totalGaps: data.totalGaps,
      gaps: data.gaps.map((g) => ({
        gapId: g.gapId,
        label: g.label,
        category: g.category,
        severity: g.severity,
      })),
      groupedSummary: data.groupedSummary.map((g) => ({
        category: g.category,
        count: g.count,
      })),
    } as GapExposedFull;
  }

  // summary — school sees counts only, no individual gap details
  return {
    level: "summary",
    totalGaps: data.totalGaps,
    groupedSummary: data.groupedSummary.map((g) => ({
      category: g.category,
      count: g.count,
    })),
  } as GapExposedSummary;
}
