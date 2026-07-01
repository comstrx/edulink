/**
 * useGrowthSummary — Intelligence-Only Growth Summary
 *
 * Reads ALL growth data from the canonical intelligence layer:
 * - Counts from intelligence_talent_profiles
 * - Gaps from intelligence gap snapshots
 *
 * ❌ Does NOT read from domain tables
 * ❌ Does NOT compute or derive intelligence
 * ✅ Maps intelligence values to UI-safe shape only
 *
 * Sprint 2.2 — Intelligence Consumption Convergence
 */

import { useMemo } from "react";
import { useTalentIntelligenceProfile } from "@/intelligence/talent/hooks/useTalentIntelligenceProfile";
import { useTeacherGapSnapshot } from "@/intelligence/consumption/hooks/useTeacherGapSnapshot";
import type {
  GrowthSummary,
  GrowthResolvedState,
  GrowthSignalFlags,
  HiringSignals,
  TrainingProgressSummary,
  CredentialSummary,
  SkillGapEntry,
} from "../types/growth-summary.types";

const EMPTY_TRAINING: TrainingProgressSummary = {
  completedCount: 0,
  verifiedCount: 0,
  activePathways: 0,
};

const EMPTY_CREDENTIALS: CredentialSummary = {
  totalActive: 0,
};

const EMPTY_SIGNALS: GrowthSignalFlags = {
  credentialsReady: false,
  trainingActive: false,
  growthMomentumActive: false,
};

const EMPTY_HIRING: HiringSignals = {
  credentialCount: 0,
  trainingCompleted: 0,
  verifiedCompletionCount: 0,
};

const EMPTY: GrowthSummary = {
  resolvedState: "unavailable",
  skillGaps: [],
  trainingProgress: EMPTY_TRAINING,
  credentials: EMPTY_CREDENTIALS,
  growthSignals: EMPTY_SIGNALS,
  hiringSignals: EMPTY_HIRING,
  unresolvedGapCount: 0,
};

export function useGrowthSummary(profileId?: string): GrowthSummary {
  const { data: talentProfile, isLoading: tpLoading } = useTalentIntelligenceProfile(profileId);
  const gapResult = useTeacherGapSnapshot(profileId);

  return useMemo(() => {
    if (!profileId) return EMPTY;

    if (tpLoading) {
      return { ...EMPTY, resolvedState: "loading" as GrowthResolvedState };
    }

    if (!talentProfile) {
      return EMPTY;
    }

    // Map gap data from intelligence snapshot
    const gaps: SkillGapEntry[] =
      gapResult.status === "ready" || gapResult.status === "stale"
        ? (gapResult.data?.gaps ?? []).map((g) => ({
            gapId: g.gapId,
            label: g.label,
            category: g.category,
            severity: g.severity,
          }))
        : [];

    // All counts from canonical intelligence_talent_profiles
    const trainingProgress: TrainingProgressSummary = {
      completedCount: talentProfile.trainingCompletionCount,
      verifiedCount: talentProfile.verifiedCompletionCount,
      activePathways: talentProfile.activePathwayCount,
    };

    const credentials: CredentialSummary = {
      totalActive: talentProfile.credentialCount,
    };

    // Signals derived from intelligence counts — NO raw table reads
    const credentialsReady = talentProfile.credentialCount >= 1;
    const trainingActive = talentProfile.activePathwayCount > 0 || talentProfile.trainingCompletionCount > 0;
    const growthMomentumActive = talentProfile.growthMomentum !== "inactive";

    const growthSignals: GrowthSignalFlags = {
      credentialsReady,
      trainingActive,
      growthMomentumActive,
    };

    const hiringSignals: HiringSignals = {
      credentialCount: talentProfile.credentialCount,
      trainingCompleted: talentProfile.trainingCompletionCount,
      verifiedCompletionCount: talentProfile.verifiedCompletionCount,
    };

    return {
      resolvedState: "resolved" as GrowthResolvedState,
      skillGaps: gaps,
      trainingProgress,
      credentials,
      growthSignals,
      hiringSignals,
      unresolvedGapCount: talentProfile.unresolvedGapCount,
    };
  }, [profileId, talentProfile, tpLoading, gapResult]);
}
