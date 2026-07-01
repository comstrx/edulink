/**
 * useTeacherFitExplanation — Hook
 *
 * Explains why a teacher appears suitable for opportunities.
 * Sprint 2.2: Uses intelligence-only GrowthSummary + Reputation.
 */

import { useMemo } from "react";
import { useGrowthSummary } from "@/growth/hooks/useGrowthSummary";
import { useProfessionalReputation } from "@/reputation/hooks/useProfessionalReputation";
import { useExposureAudience } from "@/intelligence/exposure/hooks/useExposureAudience";
import { deriveTeacherFitExplanation } from "../derivers/derive-teacher-fit";
import { mapToExplanationAudience, mapToReputationAudience } from "../utils/map-audience";
import type { ExplanationContract } from "../types/explanation-contract.types";
import { EMPTY_EXPLANATION } from "../types/explanation-contract.types";

export function useTeacherFitExplanation(
  profileId?: string
): ExplanationContract {
  const growth = useGrowthSummary(profileId);
  const exposureAudience = useExposureAudience();
  const repAudience = mapToReputationAudience(exposureAudience);
  const reputation = useProfessionalReputation(profileId, repAudience);
  const audience = mapToExplanationAudience(exposureAudience);

  return useMemo(() => {
    if (!profileId) return { ...EMPTY_EXPLANATION, context: "teacher_fit" };
    return deriveTeacherFitExplanation(growth, reputation, audience);
  }, [profileId, growth, reputation, audience]);
}
