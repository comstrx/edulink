/**
 * Verification Exposure Adapter
 *
 * Transforms VerifiedStateConsumptionData into audience-scoped DTOs.
 *
 * Phase 4A — Intelligence Governance
 */

import type { VerifiedStateConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience, VerificationExposed, VerificationExposedFull, VerificationExposedBadge, ExposedHidden } from "../types/exposure.types";
import { getExposureLevel } from "../rules/exposure-rules";

export function exposeVerification(
  data: VerifiedStateConsumptionData | null,
  audience: ExposureAudience,
): VerificationExposed {
  const level = getExposureLevel("verification", audience);

  if (level === "hidden" || !data) {
    return { level: "hidden" } as ExposedHidden;
  }

  if (level === "full") {
    return {
      level: "full",
      overallStatus: data.overallStatus,
      verifiedCount: data.verifiedCount,
      totalCount: data.totalCount,
      credentials: data.credentials,
    } as VerificationExposedFull;
  }

  // badge — minimal status indicator only
  return {
    level: "badge",
    overallStatus: data.overallStatus,
  } as VerificationExposedBadge;
}
