/**
 * useCanonicalReadiness — Single Source of Truth for Readiness
 *
 * Reads readiness ONLY from intelligence_talent_profiles.readiness_level.
 * No computation. No derivation. No fallback logic that changes meaning.
 *
 * Canonical owner: intelligence_talent_profiles
 */

import { useTalentIntelligenceProfile } from "@/intelligence/talent/hooks/useTalentIntelligenceProfile";
import type { CanonicalReadinessLevel } from "./canonical-readiness.types";
import { isCanonicalReadinessLevel } from "./canonical-readiness.types";

export interface CanonicalReadinessResult {
  readinessLevel: CanonicalReadinessLevel | null;
  isLoading: boolean;
}

export function useCanonicalReadiness(teacherId: string | undefined): CanonicalReadinessResult {
  const { data, isLoading } = useTalentIntelligenceProfile(teacherId);

  if (!teacherId || isLoading) {
    return { readinessLevel: null, isLoading: !!teacherId && isLoading };
  }

  const raw = data?.readinessLevel;
  const readinessLevel = raw && isCanonicalReadinessLevel(raw) ? raw : null;

  return { readinessLevel, isLoading: false };
}
