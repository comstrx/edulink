/**
 * useCandidateDecisionIntelligence — React hook
 *
 * Reads the talent intelligence profile and derives decision intelligence
 * (readiness, risks, decision signals, ranking explanation) client-side
 * from the pre-computed profile. No recomputation of raw data.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import { useMemo } from "react";
import { useTalentIntelligenceProfile } from "@/intelligence/talent/hooks/useTalentIntelligenceProfile";
import { buildCandidateDecisionIntelligence } from "../decision-intelligence-engine";
import type { CandidateDecisionIntelligence } from "../types/decision-intelligence.types";

export function useCandidateDecisionIntelligence(teacherId: string | undefined) {
  const { data: profile, isLoading, error } = useTalentIntelligenceProfile(teacherId);

  const intelligence = useMemo<CandidateDecisionIntelligence | null>(() => {
    if (!profile) return null;
    return buildCandidateDecisionIntelligence(profile);
  }, [profile]);

  return { data: intelligence, isLoading, error };
}
