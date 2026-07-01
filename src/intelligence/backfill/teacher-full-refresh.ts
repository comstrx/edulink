/**
 * Teacher Full Intelligence Refresh
 *
 * Triggers CRI, Match (all published jobs), Gaps, Recommendations,
 * Verified State, and Talent Profile for a single teacher.
 *
 * Unlike backfill (application-only matches), this generates match
 * snapshots against ALL published jobs for job recommendation generation.
 */

import { supabase } from "@/integrations/supabase/client";
import { refreshCri } from "@/intelligence/cri/services/cri-refresh.service";
import { refreshGaps } from "@/intelligence/gaps/services/gap-refresh.service";
import { refreshMatch } from "@/intelligence/matching/services/match-refresh.service";
import { refreshRecommendations } from "@/intelligence/recommendations/services/recommendation-refresh.service";
import { refreshVerifiedState } from "@/intelligence/verified-state/verified-state-refresh.service";
import { refreshTalentProfile } from "@/intelligence/talent/talent-refresh.service";

export interface TeacherRefreshResult {
  teacherId: string;
  cri: { success: boolean; score?: number; band?: string; error?: string };
  gaps: { success: boolean; totalGaps?: number; error?: string };
  matches: { success: boolean; count: number; scores: { jobId: string; jobTitle: string; score: number }[]; errors: string[] };
  recommendations: { success: boolean; count?: number; error?: string };
  verifiedState: { success: boolean; error?: string };
  talentProfile: { success: boolean; error?: string };
  completedAt: string;
}

export async function runTeacherFullRefresh(teacherId: string): Promise<TeacherRefreshResult> {
  console.log(`[TeacherRefresh] Starting full refresh for ${teacherId}`);

  const result: TeacherRefreshResult = {
    teacherId,
    cri: { success: false },
    gaps: { success: false },
    matches: { success: false, count: 0, scores: [], errors: [] },
    recommendations: { success: false },
    verifiedState: { success: false },
    talentProfile: { success: false },
    completedAt: "",
  };

  // 1. CRI
  try {
    const r = await refreshCri({ teacherId, triggeredByEvent: "manual_refresh" });
    result.cri = {
      success: r.success,
      score: r.criResult?.criScore,
      band: r.criResult?.criBand,
      error: r.error,
    };
    console.log(`[TeacherRefresh] CRI: score=${r.criResult?.criScore}, band=${r.criResult?.criBand}`);
  } catch (e: unknown) {
    result.cri = { success: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 2. Gaps
  try {
    const r = await refreshGaps({ teacherId, triggeredByEvent: "manual_refresh" });
    const totalGaps = r.result?.gapItems?.length ?? 0;
    result.gaps = { success: r.success, totalGaps, error: r.error };
    console.log(`[TeacherRefresh] Gaps: ${totalGaps} gaps`);
  } catch (e: unknown) {
    result.gaps = { success: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 3. Match — ALL published jobs (not just applications)
  try {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("status", "published");

    for (const job of jobs ?? []) {
      try {
        const r = await refreshMatch({ teacherId, jobId: job.id, triggeredByEvent: "manual_refresh" });
        if (r.success && r.result) {
          result.matches.count++;
          result.matches.scores.push({
            jobId: job.id,
            jobTitle: job.title,
            score: r.result.matchScore,
          });
        } else {
          result.matches.errors.push(`${job.title}: ${r.error}`);
        }
      } catch (e: unknown) {
        result.matches.errors.push(`${job.title}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    result.matches.success = result.matches.count > 0;
    console.log(`[TeacherRefresh] Matches: ${result.matches.count} computed`);
  } catch (e: unknown) {
    result.matches.errors.push(e instanceof Error ? e.message : String(e));
  }

  // 4. Verified State
  try {
    const r = await refreshVerifiedState({ teacherId, triggeredBy: "manual_refresh" });
    result.verifiedState = { success: r.success, error: r.error };
  } catch (e: unknown) {
    result.verifiedState = { success: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 5. Recommendations (AFTER matches so match signals are available)
  try {
    const r = await refreshRecommendations({ teacherId, triggeredBy: "manual_refresh" });
    const recCount = r.result?.recommendations?.length ?? 0;
    result.recommendations = { success: r.success, count: recCount, error: r.error };
    console.log(`[TeacherRefresh] Recommendations: ${recCount} generated`);
  } catch (e: unknown) {
    result.recommendations = { success: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 6. Talent Profile (aggregate all snapshots)
  try {
    const r = await refreshTalentProfile(teacherId);
    result.talentProfile = { success: r.success, error: r.error };
  } catch (e: unknown) {
    result.talentProfile = { success: false, error: e instanceof Error ? e.message : String(e) };
  }

  result.completedAt = new Date().toISOString();
  console.log(`[TeacherRefresh] Complete`, result);
  return result;
}
