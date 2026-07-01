/**
 * Intelligence Backfill Utility
 *
 * Triggers a full intelligence refresh for all teachers.
 * Sequential per teacher to avoid overwhelming the DB.
 * Idempotent: writers use stale/fresh pattern.
 *
 * Sprint 4 — Part 6
 */

import { supabase } from "@/integrations/supabase/client";
import { refreshCri } from "@/intelligence/cri/services/cri-refresh.service";
import { refreshGaps } from "@/intelligence/gaps/services/gap-refresh.service";
import { refreshMatch } from "@/intelligence/matching/services/match-refresh.service";
import { refreshRecommendations } from "@/intelligence/recommendations/services/recommendation-refresh.service";
import { refreshVerifiedState } from "@/intelligence/verified-state/verified-state-refresh.service";
import { refreshTalentProfile } from "@/intelligence/talent/talent-refresh.service";

export interface BackfillResult {
  teacherId: string;
  teacherName: string;
  cri: boolean;
  gaps: boolean;
  matches: number;
  recommendations: boolean;
  verifiedState: boolean;
  talentProfile: boolean;
  errors: string[];
}

export interface BackfillSummary {
  totalTeachers: number;
  results: BackfillResult[];
  completedAt: string;
}

export async function runIntelligenceBackfill(): Promise<BackfillSummary> {
  console.log(`[Backfill] Starting intelligence backfill for all teachers`);

  // Load all teachers
  const { data: teachers, error: teacherErr } = await supabase
    .from("teacher_profiles")
    .select("id, full_name");

  if (teacherErr || !teachers) {
    console.error(`[Backfill] Failed to load teachers`, teacherErr?.message);
    return { totalTeachers: 0, results: [], completedAt: new Date().toISOString() };
  }

  console.log(`[Backfill] Found ${teachers.length} teachers`);

  const results: BackfillResult[] = [];

  for (const teacher of teachers) {
    const teacherId = teacher.id;
    const teacherName = teacher.full_name ?? "Unknown";
    const errors: string[] = [];

    console.log(`[Backfill] Processing ${teacherName} (${teacherId})`);

    // 1. CRI
    let criOk = false;
    try {
      const r = await refreshCri({ teacherId, triggeredByEvent: "backfill" });
      criOk = r.success;
      if (!r.success) errors.push(`CRI: ${r.error}`);
    } catch (e: unknown) {
      errors.push(`CRI: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 2. Gaps
    let gapsOk = false;
    try {
      const r = await refreshGaps({ teacherId, triggeredByEvent: "backfill" });
      gapsOk = r.success;
      if (!r.success) errors.push(`Gaps: ${r.error}`);
    } catch (e: unknown) {
      errors.push(`Gaps: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 3. Matches — one per application
    let matchCount = 0;
    try {
      const { data: apps } = await supabase
        .from("applications")
        .select("job_id")
        .eq("teacher_id", teacherId);

      for (const app of apps ?? []) {
        try {
          const r = await refreshMatch({ teacherId, jobId: app.job_id, triggeredByEvent: "backfill" });
          if (r.success) matchCount++;
          else errors.push(`Match(${app.job_id}): ${r.error}`);
        } catch (e: unknown) {
          errors.push(`Match(${app.job_id}): ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e: unknown) {
      errors.push(`Match load: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 4. Recommendations
    let recsOk = false;
    try {
      const r = await refreshRecommendations({ teacherId, triggeredBy: "backfill" });
      recsOk = r.success;
      if (!r.success) errors.push(`Recs: ${r.error}`);
    } catch (e: unknown) {
      errors.push(`Recs: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 5. Verified State
    let vsOk = false;
    try {
      const r = await refreshVerifiedState({ teacherId, triggeredBy: "backfill" });
      vsOk = r.success;
      if (!r.success) errors.push(`VS: ${r.error}`);
    } catch (e: unknown) {
      errors.push(`VS: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 6. Talent Profile (re-aggregate with fresh data)
    let tpOk = false;
    try {
      const r = await refreshTalentProfile(teacherId);
      tpOk = r.success;
      if (!r.success) errors.push(`TP: ${r.error}`);
    } catch (e: unknown) {
      errors.push(`TP: ${e instanceof Error ? e.message : String(e)}`);
    }

    results.push({
      teacherId,
      teacherName,
      cri: criOk,
      gaps: gapsOk,
      matches: matchCount,
      recommendations: recsOk,
      verifiedState: vsOk,
      talentProfile: tpOk,
      errors,
    });

    console.log(`[Backfill] Completed ${teacherName}: CRI=${criOk} Gaps=${gapsOk} Matches=${matchCount} Recs=${recsOk} VS=${vsOk} TP=${tpOk}`);
  }

  const summary: BackfillSummary = {
    totalTeachers: teachers.length,
    results,
    completedAt: new Date().toISOString(),
  };

  console.log(`[Backfill] Complete`, {
    total: summary.totalTeachers,
    successful: results.filter((r) => r.errors.length === 0).length,
  });

  return summary;
}
