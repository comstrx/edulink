/**
 * School Team Intelligence Reader — Sprint 13 PART 2
 *
 * Aggregates existing school workforce snapshots into a canonical
 * team intelligence output.
 *
 * Reads ONLY from:
 *   - school_team_members (team scoping)
 *   - department_capability_snapshots
 *   - promotion_readiness_entries
 *   - intelligence_cri_snapshots
 *   - intelligence_verified_state_snapshots
 *
 * No computation — pure aggregation of pre-computed snapshots.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  SchoolTeamIntelligence,
  DepartmentSummaryEntry,
  PromotionReadinessSummary,
  TrainingReadinessSummary,
  VerifiedStaffSummary,
} from "../types/school-intelligence.types";

export async function resolveSchoolTeamIntelligence(
  schoolId: string,
): Promise<SchoolTeamIntelligence | null> {
  try {
    // 1. Get team members
    const { data: members } = await supabase
      .from("school_team_members")
      .select("teacher_id")
      .eq("school_id", schoolId);

    const teacherIds = (members ?? []).map((m) => m.teacher_id);
    const teamSize = teacherIds.length;

    if (teamSize === 0) {
      return {
        schoolId,
        teamSize: 0,
        departmentSummary: [],
        promotionReadiness: { readyCount: 0, nearReadyCount: 0, needsDevelopmentCount: 0, averageReadinessPercent: 0 },
        trainingReadiness: { activeTrainingCount: 0, completedTrainingCount: 0, noTrainingCount: teamSize, teamAverageCri: 0 },
        verifiedStaff: { fullyVerified: 0, partiallyVerified: 0, unverified: 0, verifiedSharePercent: 0 },
        computedAt: new Date().toISOString(),
      };
    }

    // 2. Fetch all snapshot data in parallel
    const [deptRes, promoRes, criRes, verifiedRes] = await Promise.all([
      supabase
        .from("department_capability_snapshots")
        .select("department_key, department_label, teacher_count, average_cri_score, verified_count, gap_score")
        .eq("school_id", schoolId),
      supabase
        .from("promotion_readiness_entries")
        .select("teacher_id, readiness_percent")
        .eq("school_id", schoolId),
      supabase
        .from("intelligence_cri_snapshots")
        .select("teacher_id, score")
        .in("teacher_id", teacherIds),
      supabase
        .from("intelligence_verified_state_snapshots")
        .select("teacher_id, overall_status")
        .in("teacher_id", teacherIds),
    ]);

    // 3. Department summary
    const departmentSummary: DepartmentSummaryEntry[] = (deptRes.data ?? []).map((d) => ({
      departmentKey: d.department_key,
      departmentLabel: d.department_label,
      teacherCount: d.teacher_count,
      averageCri: Number(d.average_cri_score),
      verifiedCount: d.verified_count,
      gapScore: Number(d.gap_score),
    }));

    // 4. Promotion readiness
    const promoEntries = promoRes.data ?? [];
    const promotionReadiness = aggregatePromotion(promoEntries);

    // 5. Training readiness (from CRI snapshots)
    const criData = criRes.data ?? [];
    const criByTeacher = new Map<string, number>();
    for (const c of criData) {
      const existing = criByTeacher.get(c.teacher_id);
      if (!existing || Number(c.score) > existing) {
        criByTeacher.set(c.teacher_id, Number(c.score));
      }
    }
    const trainingReadiness = aggregateTrainingReadiness(teacherIds, criByTeacher);

    // 6. Verified staff
    const verifiedData = verifiedRes.data ?? [];
    const verifiedByTeacher = new Map<string, string>();
    for (const v of verifiedData) {
      verifiedByTeacher.set(v.teacher_id, v.overall_status);
    }
    const verifiedStaff = aggregateVerifiedStaff(teacherIds, verifiedByTeacher);

    return {
      schoolId,
      teamSize,
      departmentSummary,
      promotionReadiness,
      trainingReadiness,
      verifiedStaff,
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[SchoolTeamIntelligence] Failed:", err);
    return null;
  }
}

// ── Aggregation Helpers ────────────────────────────────────────

function aggregatePromotion(
  entries: Array<{ teacher_id: string; readiness_percent: number }>,
): PromotionReadinessSummary {
  let readyCount = 0, nearReadyCount = 0, needsDevelopmentCount = 0;
  let totalPercent = 0;

  for (const e of entries) {
    const pct = Number(e.readiness_percent);
    totalPercent += pct;
    if (pct >= 80) readyCount++;
    else if (pct >= 50) nearReadyCount++;
    else needsDevelopmentCount++;
  }

  return {
    readyCount,
    nearReadyCount,
    needsDevelopmentCount,
    averageReadinessPercent: entries.length > 0
      ? Math.round(totalPercent / entries.length)
      : 0,
  };
}

function aggregateTrainingReadiness(
  teacherIds: string[],
  criMap: Map<string, number>,
): TrainingReadinessSummary {
  let withCri = 0;
  let totalCri = 0;

  for (const tid of teacherIds) {
    const cri = criMap.get(tid);
    if (cri != null) {
      withCri++;
      totalCri += cri;
    }
  }

  // Teachers with CRI > 0 have had some training signal
  const activeTrainingCount = [...criMap.values()].filter((c) => c > 0 && c < 100).length;
  const completedTrainingCount = [...criMap.values()].filter((c) => c >= 70).length;
  const noTrainingCount = teacherIds.length - withCri;

  return {
    activeTrainingCount,
    completedTrainingCount,
    noTrainingCount,
    teamAverageCri: withCri > 0 ? Math.round(totalCri / withCri) : 0,
  };
}

function aggregateVerifiedStaff(
  teacherIds: string[],
  verifiedMap: Map<string, string>,
): VerifiedStaffSummary {
  let fullyVerified = 0, partiallyVerified = 0, unverified = 0;

  for (const tid of teacherIds) {
    const status = verifiedMap.get(tid);
    if (status === "full") fullyVerified++;
    else if (status === "partial") partiallyVerified++;
    else unverified++;
  }

  const total = teacherIds.length;
  const verifiedSharePercent = total > 0
    ? Math.round(((fullyVerified + partiallyVerified) / total) * 100)
    : 0;

  return { fullyVerified, partiallyVerified, unverified, verifiedSharePercent };
}
