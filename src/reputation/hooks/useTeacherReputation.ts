/**
 * useTeacherReputation — Sprint 8B
 *
 * Reads the teacher's reputation profile and recent events.
 */

import { useQuery } from "@tanstack/react-query";
import type { ReputationProfile, ReputationDimension } from "../types/reputation.types";
import { ALL_DIMENSIONS } from "../engine/reputation-weights";
import { explainTier } from "../engine/reputation-tier-engine";
import { buildReputationSignals } from "../engine/reputation-signals";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherReputationView {
  profile: ReputationProfile | null;
  tierExplanation: ReturnType<typeof explainTier> | null;
  signals: ReturnType<typeof buildReputationSignals>;
  isLoading: boolean;
}

interface ReputationProfileRow {
  teacher_id: string;
  reputation_score: number;
  credibility_tier: string;
  dimension_scores: Record<string, number> | null;
  total_reputation_events: number;
  verified_signal_count: number;
  updated_at: string;
}

export function useTeacherReputation(teacherId?: string): TeacherReputationView {
  const { data, isLoading } = useQuery({
    queryKey: ["reputation_profile", teacherId],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("reputation_profiles")
        .select("teacher_id, reputation_score, credibility_tier, dimension_scores, total_reputation_events, verified_signal_count, updated_at")
        .eq("teacher_id", teacherId!)
        .returns<ReputationProfileRow[]>()
        .maybeSingle();

      if (!row) return null;

      const dimensionScores = {} as Record<ReputationDimension, number>;
      for (const d of ALL_DIMENSIONS) {
        dimensionScores[d] = row.dimension_scores?.[d] ?? 0;
      }

      return {
        teacherId: row.teacher_id,
        reputationScore: row.reputation_score,
        credibilityTier: row.credibility_tier,
        dimensionScores,
        totalReputationEvents: row.total_reputation_events,
        verifiedSignalCount: row.verified_signal_count,
        updatedAt: row.updated_at,
      } as ReputationProfile;
    },
    enabled: !!teacherId,
  });

  const profile = data ?? null;

  const tierExplanation = profile
    ? explainTier({
        reputationScore: profile.reputationScore,
        dimensionScores: profile.dimensionScores,
        verifiedSignalCount: profile.verifiedSignalCount,
      })
    : null;

  const signals = profile ? buildReputationSignals(profile) : [];

  return { profile, tierExplanation, signals, isLoading };
}
