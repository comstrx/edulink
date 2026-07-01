/**
 * School Hiring Intelligence Reader — Sprint 13 PART 2
 *
 * Aggregates existing teacher-level intelligence snapshots
 * scoped to a school's active jobs and applicants.
 *
 * ⚠️ Readiness distribution reads CANONICAL readiness_level from
 * intelligence_talent_profiles — NO recomputation from CRI scores.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  SchoolHiringIntelligence,
  MatchHealthDistribution,
  ReadinessDistribution,
  VerifiedCandidatesSummary,
  TopFitCandidate,
} from "../types/school-intelligence.types";

const EMPTY_READINESS: ReadinessDistribution = {
  highlyReady: 0, ready: 0, developing: 0, early: 0, unscored: 0,
};

export async function resolveSchoolHiringIntelligence(
  schoolId: string,
): Promise<SchoolHiringIntelligence | null> {
  try {
    // 1. Get active jobs for this school
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("school_id", schoolId)
      .eq("status", "published");

    const activeJobIds = (jobs ?? []).map((j) => j.id);
    if (activeJobIds.length === 0) {
      return {
        schoolId,
        activeJobCount: 0,
        totalApplicants: 0,
        matchHealth: { strong: 0, moderate: 0, weak: 0, unscored: 0, averageScore: 0 },
        readinessDistribution: { ...EMPTY_READINESS },
        verifiedCandidates: { fullyVerified: 0, partiallyVerified: 0, unverified: 0, verifiedSharePercent: 0 },
        topFitCandidates: [],
        computedAt: new Date().toISOString(),
      };
    }

    // 2. Get unique applicant teacher IDs
    const { data: apps } = await supabase
      .from("applications")
      .select("teacher_id, job_id")
      .in("job_id", activeJobIds)
      .not("status", "in", '("withdrawn","rejected")');

    const applicants = apps ?? [];
    const teacherIds = [...new Set(applicants.map((a) => a.teacher_id))];
    const teacherJobPairs = applicants.map((a) => ({ teacherId: a.teacher_id, jobId: a.job_id }));

    if (teacherIds.length === 0) {
      return {
        schoolId,
        activeJobCount: activeJobIds.length,
        totalApplicants: 0,
        matchHealth: { strong: 0, moderate: 0, weak: 0, unscored: 0, averageScore: 0 },
        readinessDistribution: { ...EMPTY_READINESS },
        verifiedCandidates: { fullyVerified: 0, partiallyVerified: 0, unverified: 0, verifiedSharePercent: 0 },
        topFitCandidates: [],
        computedAt: new Date().toISOString(),
      };
    }

    // 3. Fetch snapshots in parallel — readiness from canonical source
    const [matchRes, talentRes, verifiedRes] = await Promise.all([
      supabase
        .from("intelligence_match_snapshots")
        .select("teacher_id, job_id, score")
        .in("teacher_id", teacherIds)
        .in("job_id", activeJobIds),
      supabase
        .from("intelligence_talent_profiles")
        .select("teacher_id, readiness_level, cri_score")
        .in("teacher_id", teacherIds),
      supabase
        .from("intelligence_verified_state_snapshots")
        .select("teacher_id, overall_status")
        .in("teacher_id", teacherIds),
    ]);

    // 4. Aggregate match health
    const matchScores = matchRes.data ?? [];
    const matchByTeacherJob = new Map<string, number>();
    for (const m of matchScores) {
      matchByTeacherJob.set(`${m.teacher_id}:${m.job_id}`, Number(m.score));
    }
    const matchHealth = aggregateMatchHealth(teacherJobPairs, matchByTeacherJob);

    // 5. Aggregate readiness from CANONICAL readiness_level
    const talentProfiles = talentRes.data ?? [];
    const readinessByTeacher = new Map<string, string>();
    const criByTeacher = new Map<string, number>();
    for (const t of talentProfiles) {
      readinessByTeacher.set(t.teacher_id, t.readiness_level);
      criByTeacher.set(t.teacher_id, Number(t.cri_score));
    }
    const readinessDistribution = aggregateCanonicalReadiness(teacherIds, readinessByTeacher);

    // 6. Aggregate verified state
    const verifiedStates = verifiedRes.data ?? [];
    const verifiedByTeacher = new Map<string, string>();
    for (const v of verifiedStates) {
      verifiedByTeacher.set(v.teacher_id, v.overall_status);
    }
    const verifiedCandidates = aggregateVerified(teacherIds, verifiedByTeacher);

    // 7. Top-fit candidates (top 5 by match score)
    const topFitCandidates = resolveTopFit(teacherJobPairs, matchByTeacherJob, criByTeacher, verifiedByTeacher);

    return {
      schoolId,
      activeJobCount: activeJobIds.length,
      totalApplicants: teacherIds.length,
      matchHealth,
      readinessDistribution,
      verifiedCandidates,
      topFitCandidates,
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[SchoolHiringIntelligence] Failed:", err);
    return null;
  }
}

// ── Aggregation Helpers ────────────────────────────────────────

function aggregateMatchHealth(
  pairs: { teacherId: string; jobId: string }[],
  matchMap: Map<string, number>,
): MatchHealthDistribution {
  let strong = 0, moderate = 0, weak = 0, unscored = 0;
  let totalScore = 0, scoredCount = 0;

  for (const p of pairs) {
    const score = matchMap.get(`${p.teacherId}:${p.jobId}`);
    if (score == null) { unscored++; continue; }
    scoredCount++;
    totalScore += score;
    if (score >= 70) strong++;
    else if (score >= 40) moderate++;
    else weak++;
  }

  return {
    strong, moderate, weak, unscored,
    averageScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
  };
}

/**
 * Aggregates readiness from CANONICAL readiness_level values.
 * No CRI thresholds. No recomputation.
 */
function aggregateCanonicalReadiness(
  teacherIds: string[],
  readinessMap: Map<string, string>,
): ReadinessDistribution {
  let highlyReady = 0, ready = 0, developing = 0, early = 0, unscored = 0;

  for (const tid of teacherIds) {
    const level = readinessMap.get(tid);
    switch (level) {
      case "highly_ready": highlyReady++; break;
      case "ready": ready++; break;
      case "developing": developing++; break;
      case "early": early++; break;
      default: unscored++; break;
    }
  }

  return { highlyReady, ready, developing, early, unscored };
}

function aggregateVerified(
  teacherIds: string[],
  verifiedMap: Map<string, string>,
): VerifiedCandidatesSummary {
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

function resolveTopFit(
  pairs: { teacherId: string; jobId: string }[],
  matchMap: Map<string, number>,
  criMap: Map<string, number>,
  verifiedMap: Map<string, string>,
): TopFitCandidate[] {
  const scored: TopFitCandidate[] = [];

  for (const p of pairs) {
    const matchScore = matchMap.get(`${p.teacherId}:${p.jobId}`);
    if (matchScore == null) continue;
    scored.push({
      teacherId: p.teacherId,
      jobId: p.jobId,
      matchScore,
      criScore: criMap.get(p.teacherId) ?? null,
      verifiedStatus: (verifiedMap.get(p.teacherId) ?? "none") as "none" | "partial" | "full",
    });
  }

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}
