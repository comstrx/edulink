/**
 * useProviderVisibilityExplanation — Hook
 *
 * Explains why a provider appears publicly.
 */

import { useMemo } from "react";
import { useExposureAudience } from "@/intelligence/exposure/hooks/useExposureAudience";
import { deriveProviderVisibilityExplanation, type ProviderVisibilityInput } from "../derivers/derive-provider-visibility";
import { mapToExplanationAudience } from "../utils/map-audience";
import type { ExplanationContract } from "../types/explanation-contract.types";
import { EMPTY_EXPLANATION } from "../types/explanation-contract.types";

export function useProviderVisibilityExplanation(
  input?: ProviderVisibilityInput
): ExplanationContract {
  const exposureAudience = useExposureAudience();
  const audience = mapToExplanationAudience(exposureAudience);

  return useMemo(() => {
    if (!input) return { ...EMPTY_EXPLANATION, context: "provider_visibility" };
    return deriveProviderVisibilityExplanation(input, audience);
  }, [input, audience]);
}
