/**
 * Verification Context Reader — Sprint 13 PART 3
 *
 * Reads intelligence snapshots to determine the impact of a verification event.
 * Used by the decision engine to gate noise and boost visibility when justified.
 *
 * Reads ONLY intelligence snapshots — no domain tables.
 */

import { supabaseRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import { supabase } from "@/integrations/supabase/client";

export interface VerificationDecisionContext {
  teacherId: string;
  /** Current CRI score (if available) */
  criScore: number | null;
  /** Current readiness level from talent profile */
  readinessLevel: string | null;
  /** Whether teacher already has recommendations */
  hasExistingRecommendations: boolean;
  recommendationCount: number;
  /** Current verified state */
  currentVerifiedStatus: "none" | "partial" | "full" | null;
  verifiedCount: number;
  totalCredentials: number;
  /** Whether teacher has unresolved gaps */
  hasUnresolvedGaps: boolean;
  unresolvedGapCount: number;
  /** Growth momentum */
  growthMomentum: string | null;
}

export async function readVerificationContext(
  teacherId: string,
): Promise<VerificationDecisionContext> {
  try {
    // Get latest CRI job ID from talent profile first
    const talentQuery = supabase
      .from("intelligence_talent_profiles")
      .select("readiness_level, growth_momentum, unresolved_gap_count, cri_score, cri_job_id")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    const talentResult = await talentQuery;
    const criJobId = talentResult.data?.cri_job_id;

    const [criResult, recResult, verifiedResult, gapResult] = await Promise.all([
      criJobId ? safeGet(() => supabaseRepository.getTeacherCriSnapshot(teacherId, criJobId)) : Promise.resolve(null),
      safeGet(() => supabaseRepository.getTeacherRecommendationsSnapshot(teacherId)),
      safeGet(() => supabaseRepository.getTeacherVerifiedStateSnapshot(teacherId)),
      safeGet(() => supabaseRepository.getTeacherGapSnapshot(teacherId)),
    ]);
    const cri = criResult?.status === "found" ? criResult.data : null;
    const recs = recResult?.status === "found" ? recResult.data : null;
    const verified = verifiedResult?.status === "found" ? verifiedResult.data : null;
    const gaps = gapResult?.status === "found" ? gapResult.data : null;

    return {
      teacherId,
      criScore: cri?.score ?? (talentResult.data?.cri_score != null ? Number(talentResult.data.cri_score) : null),
      readinessLevel: talentResult.data?.readiness_level ?? null,
      hasExistingRecommendations: (recs?.totalCount ?? 0) > 0,
      recommendationCount: recs?.totalCount ?? 0,
      currentVerifiedStatus: verified?.overallStatus ?? null,
      verifiedCount: verified?.verifiedCount ?? 0,
      totalCredentials: verified?.totalCount ?? 0,
      hasUnresolvedGaps: (gaps?.totalGaps ?? 0) > 0,
      unresolvedGapCount: gaps?.totalGaps ?? 0,
      growthMomentum: talentResult.data?.growth_momentum ?? null,
    };
  } catch (err) {
    console.warn("[SmartGlue:VerificationContext] Read failed:", err);
    return {
      teacherId,
      criScore: null,
      readinessLevel: null,
      hasExistingRecommendations: false,
      recommendationCount: 0,
      currentVerifiedStatus: null,
      verifiedCount: 0,
      totalCredentials: 0,
      hasUnresolvedGaps: false,
      unresolvedGapCount: 0,
      growthMomentum: null,
    };
  }
}

async function safeGet<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
