/**
 * useTalentIntelligenceProfile — React Query hook
 *
 * Reads the persisted talent intelligence profile for a teacher.
 * Consumption-only — no computation.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TalentIntelligenceProfile } from "../types/talent-intelligence.types";
import type { Database } from "@/integrations/supabase/types";

type TalentProfileRow = Database["public"]["Tables"]["intelligence_talent_profiles"]["Row"];

function mapRowToProfile(row: TalentProfileRow): TalentIntelligenceProfile {
  return {
    teacherId: row.teacher_id,
    criScore: Number(row.cri_score) || 0,
    criDimensions: (Array.isArray(row.cri_dimensions) ? row.cri_dimensions : []) as unknown as TalentIntelligenceProfile["criDimensions"],
    criJobId: row.cri_job_id ?? null,
    verifiedSignalCount: row.verified_signal_count ?? 0,
    verifiedCompletionCount: row.verified_completion_count ?? 0,
    credentialCount: row.credential_count ?? 0,
    credentialVerifiedCount: row.credential_verified_count ?? 0,
    credentialStrength: (row.credential_strength ?? "none") as TalentIntelligenceProfile["credentialStrength"],
    pathwayCompletionCount: row.pathway_completion_count ?? 0,
    activePathwayCount: row.active_pathway_count ?? 0,
    trainingCompletionCount: row.training_completion_count ?? 0,
    unresolvedGapCount: row.unresolved_gap_count ?? 0,
    gapCategories: row.gap_categories ?? [],
    bestMatchScore: row.best_match_score != null ? Number(row.best_match_score) : null,
    bestMatchJobId: row.best_match_job_id ?? null,
    hiringAdvantageSignals: (Array.isArray(row.hiring_advantage_signals)
      ? row.hiring_advantage_signals
      : []) as unknown as TalentIntelligenceProfile["hiringAdvantageSignals"],
    growthMomentum: (row.growth_momentum ?? "inactive") as TalentIntelligenceProfile["growthMomentum"],
    readinessLevel: (row.readiness_level ?? "early") as TalentIntelligenceProfile["readinessLevel"],
    intelligenceUpdatedAt: row.intelligence_updated_at ?? "",
    engineVersion: row.engine_version ?? "",
  };
}

export function useTalentIntelligenceProfile(teacherId: string | undefined) {
  return useQuery({
    queryKey: ["intelligence", "talent_profile", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intelligence_talent_profiles")
        .select("id, created_at, updated_at, teacher_id, cri_score, cri_dimensions, cri_job_id, verified_signal_count, verified_completion_count, credential_count, credential_verified_count, credential_strength, pathway_completion_count, active_pathway_count, training_completion_count, unresolved_gap_count, gap_categories, best_match_score, best_match_job_id, hiring_advantage_signals, growth_momentum, readiness_level, intelligence_updated_at, engine_version")
        .eq("teacher_id", teacherId!)
        .maybeSingle();

      if (error) {
        console.warn("[TalentProfile] Query error:", error.message);
        return null;
      }
      if (!data) return null;
      return mapRowToProfile(data);
    },
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });
}
