/**
 * useReadinessExplanation — Hook
 *
 * Explains why a teacher has the current career readiness level.
 * Readiness level comes from canonical source (intelligence_talent_profiles).
 * Sprint 2.2: Uses intelligence-only GrowthSummary.
 */

import { useMemo } from "react";
import { useGrowthSummary } from "@/growth/hooks/useGrowthSummary";
import { useProfessionalReputation } from "@/reputation/hooks/useProfessionalReputation";
import { useExposureAudience } from "@/intelligence/exposure/hooks/useExposureAudience";
import { useCanonicalReadiness } from "@/intelligence/readiness";
import { deriveReadinessExplanation } from "../derivers/derive-readiness";
import { mapToExplanationAudience, mapToReputationAudience } from "../utils/map-audience";
import type { ExplanationContract } from "../types/explanation-contract.types";
import { EMPTY_EXPLANATION } from "../types/explanation-contract.types";

export function useReadinessExplanation(
  profileId?: string
): ExplanationContract {
  const growth = useGrowthSummary(profileId);
  const { readinessLevel } = useCanonicalReadiness(profileId);
  const exposureAudience = useExposureAudience();
  const repAudience = mapToReputationAudience(exposureAudience);
  const reputation = useProfessionalReputation(profileId, repAudience);
  const audience = mapToExplanationAudience(exposureAudience);

  return useMemo(() => {
    if (!profileId) return { ...EMPTY_EXPLANATION, context: "career_readiness" };
    return deriveReadinessExplanation(growth, reputation, audience, readinessLevel);
  }, [profileId, growth, reputation, audience, readinessLevel]);
}
