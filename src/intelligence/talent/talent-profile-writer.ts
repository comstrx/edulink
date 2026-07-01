/**
 * Talent Intelligence Profile Writer
 *
 * Persists the aggregated TalentIntelligenceProfile to the database.
 * Uses upsert (ON CONFLICT teacher_id) for idempotent updates.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

import { supabase } from "@/integrations/supabase/client";
import type { TalentIntelligenceProfile } from "./types/talent-intelligence.types";
import type { Json } from "@/integrations/supabase/types";

export async function writeTalentProfile(
  profile: TalentIntelligenceProfile,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("intelligence_talent_profiles")
    .upsert([
      {
        teacher_id: profile.teacherId,
        cri_score: profile.criScore,
        cri_dimensions: profile.criDimensions as unknown as Json,
        cri_job_id: profile.criJobId,
        verified_signal_count: profile.verifiedSignalCount,
        verified_completion_count: profile.verifiedCompletionCount,
        credential_count: profile.credentialCount,
        credential_verified_count: profile.credentialVerifiedCount,
        credential_strength: profile.credentialStrength,
        pathway_completion_count: profile.pathwayCompletionCount,
        active_pathway_count: profile.activePathwayCount,
        training_completion_count: profile.trainingCompletionCount,
        unresolved_gap_count: profile.unresolvedGapCount,
        gap_categories: profile.gapCategories,
        best_match_score: profile.bestMatchScore,
        best_match_job_id: profile.bestMatchJobId,
        hiring_advantage_signals: profile.hiringAdvantageSignals as unknown as Json,
        growth_momentum: profile.growthMomentum,
        readiness_level: profile.readinessLevel,
        intelligence_updated_at: profile.intelligenceUpdatedAt,
        engine_version: profile.engineVersion,
      },
    ], { onConflict: "teacher_id" });

  if (error) {
    console.error("[TalentProfileWriter] Failed to persist:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
