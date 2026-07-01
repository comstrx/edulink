/**
 * useMentorTrustExplanation — Hook
 *
 * Explains why a mentor is considered trustworthy.
 */

import { useMemo } from "react";
import { useProfessionalReputation } from "@/reputation/hooks/useProfessionalReputation";
import { useExposureAudience } from "@/intelligence/exposure/hooks/useExposureAudience";
import { deriveMentorTrustExplanation } from "../derivers/derive-mentor-trust";
import { mapToExplanationAudience, mapToReputationAudience } from "../utils/map-audience";
import type { ExplanationContract } from "../types/explanation-contract.types";
import { EMPTY_EXPLANATION } from "../types/explanation-contract.types";

export function useMentorTrustExplanation(
  profileId?: string
): ExplanationContract {
  const exposureAudience = useExposureAudience();
  const repAudience = mapToReputationAudience(exposureAudience);
  const reputation = useProfessionalReputation(profileId, repAudience);
  const audience = mapToExplanationAudience(exposureAudience);

  return useMemo(() => {
    if (!profileId) return { ...EMPTY_EXPLANATION, context: "mentor_trust" };
    return deriveMentorTrustExplanation(reputation, audience);
  }, [profileId, reputation, audience]);
}
