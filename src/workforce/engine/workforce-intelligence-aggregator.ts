/**
 * Workforce Intelligence Aggregator — Sprint 8D
 *
 * Aggregates individual teacher intelligence signals into
 * school-level workforce capability insights.
 *
 * Pipeline: Load Team → Collect Signals → Aggregate → Detect Gaps → Persist
 */

import type {
  TeacherWorkforceSignals,
  SchoolWorkforceProfile,
  DepartmentCapability,
  WorkforceGap,
  PromotionReadinessEntry,
  WorkforceGapSeverity,
} from "../types/workforce.types";

// ── Aggregate Workforce Profile ─────────────────────────────────

export function aggregateWorkforceProfile(
  schoolId: string,
  teachers: TeacherWorkforceSignals[],
): SchoolWorkforceProfile {
  const count = teachers.length;
  if (count === 0) {
    return emptyProfile(schoolId);
  }

  const verifiedCount = teachers.filter((t) => t.verifiedCompletionCount > 0).length;
  const avgReputation = teachers.reduce((s, t) => s + t.reputationScore, 0) / count;
  const avgCri = teachers.reduce((s, t) => s + t.criScore, 0) / count;
  const withCredentials = teachers.filter((t) => t.credentialCount > 0).length;
  const credentialCoverage = Math.round((withCredentials / count) * 100);

  // Career stage distribution
  const stageDistribution: Record<string, number> = {};
  for (const t of teachers) {
    const stage = t.careerStageName ?? "unassigned";
    stageDistribution[stage] = (stageDistribution[stage] ?? 0) + 1;
  }

  // Reputation tier distribution
  const repDistribution: Record<string, number> = {};
  for (const t of teachers) {
    repDistribution[t.reputationTier] = (repDistribution[t.reputationTier] ?? 0) + 1;
  }

  const promotionReady = teachers.filter((t) => t.readinessPercent >= 70).length;

  const gaps = detectWorkforceGaps(teachers, credentialCoverage, avgReputation);

  return {
    schoolId,
    teacherCount: count,
    verifiedTeacherCount: verifiedCount,
    averageReputationScore: Math.round(avgReputation * 100) / 100,
    averageCriScore: Math.round(avgCri * 100) / 100,
    credentialCoverage,
    careerStageDistribution: stageDistribution,
    reputationDistribution: repDistribution,
    topGaps: gaps.slice(0, 5),
    promotionReadyCount: promotionReady,
    workforceUpdatedAt: new Date().toISOString(),
  };
}

// ── Aggregate Department Capabilities ───────────────────────────

export function aggregateDepartmentCapabilities(
  teachers: TeacherWorkforceSignals[],
  subjectLabels: Record<string, string>,
): DepartmentCapability[] {
  // Group by subject
  const bySubject = new Map<string, TeacherWorkforceSignals[]>();
  for (const t of teachers) {
    for (const subjectId of t.subjectTermIds) {
      if (!bySubject.has(subjectId)) bySubject.set(subjectId, []);
      bySubject.get(subjectId)!.push(t);
    }
  }

  const departments: DepartmentCapability[] = [];
  for (const [subjectId, members] of bySubject) {
    const count = members.length;
    const avgRep = members.reduce((s, t) => s + t.reputationScore, 0) / count;
    const avgCri = members.reduce((s, t) => s + t.criScore, 0) / count;
    const verified = members.filter((t) => t.verifiedCompletionCount > 0).length;
    const withCred = members.filter((t) => t.credentialCount > 0).length;

    const stageDistribution: Record<string, number> = {};
    for (const t of members) {
      const stage = t.careerStageName ?? "unassigned";
      stageDistribution[stage] = (stageDistribution[stage] ?? 0) + 1;
    }

    // Gap score: higher = more gaps (0-100)
    const credCoverage = count > 0 ? (withCred / count) * 100 : 0;
    const verifiedRatio = count > 0 ? (verified / count) * 100 : 0;
    const gapScore = Math.round(100 - (credCoverage * 0.4 + verifiedRatio * 0.3 + Math.min(avgRep, 100) * 0.3));

    departments.push({
      departmentKey: subjectId,
      departmentLabel: subjectLabels[subjectId] ?? subjectId,
      teacherCount: count,
      averageReputationScore: Math.round(avgRep * 100) / 100,
      averageCriScore: Math.round(avgCri * 100) / 100,
      verifiedCount: verified,
      credentialCoverage: Math.round(credCoverage),
      stageDistribution,
      gapScore: Math.max(0, Math.min(100, gapScore)),
    });
  }

  return departments.sort((a, b) => b.gapScore - a.gapScore);
}

// ── Build Promotion Pipeline ────────────────────────────────────

export function buildPromotionPipeline(
  teachers: TeacherWorkforceSignals[],
): PromotionReadinessEntry[] {
  return teachers
    .filter((t) => t.readinessPercent > 0 && t.nextStageName)
    .map((t) => ({
      teacherId: t.teacherId,
      teacherName: t.teacherName,
      currentStage: t.careerStageName,
      nextStage: t.nextStageName,
      readinessPercent: t.readinessPercent,
      gapCount: t.gapCount,
      blockingGaps: t.blockingGaps,
    }))
    .sort((a, b) => b.readinessPercent - a.readinessPercent);
}

// ── Gap Detection ───────────────────────────────────────────────

function detectWorkforceGaps(
  teachers: TeacherWorkforceSignals[],
  credentialCoverage: number,
  avgReputation: number,
): WorkforceGap[] {
  const gaps: WorkforceGap[] = [];

  if (credentialCoverage < 30) {
    gaps.push({
      gapType: "low_credential_coverage",
      severity: credentialCoverage < 10 ? "critical" : "high",
      description: `Only ${credentialCoverage}% of teachers hold credentials`,
      recommendedIntervention: "Assign credential-bearing training pathways to uncredentialed staff",
    });
  }

  const verifiedRatio = teachers.length > 0
    ? (teachers.filter((t) => t.verifiedCompletionCount > 0).length / teachers.length) * 100
    : 0;
  if (verifiedRatio < 40) {
    gaps.push({
      gapType: "low_verified_evidence",
      severity: verifiedRatio < 15 ? "critical" : "high",
      description: `Only ${Math.round(verifiedRatio)}% of teachers have verified evidence`,
      recommendedIntervention: "Encourage evidence submission and mentor review participation",
    });
  }

  const promotionReady = teachers.filter((t) => t.readinessPercent >= 70).length;
  if (promotionReady === 0 && teachers.length >= 3) {
    gaps.push({
      gapType: "no_leadership_pipeline",
      severity: "high",
      description: "No teachers currently ready for career advancement",
      recommendedIntervention: "Invest in leadership-track training and mentorship programs",
    });
  }

  if (avgReputation < 20 && teachers.length > 0) {
    gaps.push({
      gapType: "low_reputation_average",
      severity: avgReputation < 10 ? "critical" : "medium",
      description: `Average professional reputation score is ${Math.round(avgReputation)}`,
      recommendedIntervention: "Support professional development and verified evidence collection",
    });
  }

  // Check for promotion bottleneck — many teachers at same stage
  const stages = Object.entries(
    teachers.reduce<Record<string, number>>((acc, t) => {
      const s = t.careerStageName ?? "unassigned";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {}),
  );
  for (const [stage, count] of stages) {
    if (count >= Math.ceil(teachers.length * 0.6) && teachers.length >= 4) {
      gaps.push({
        gapType: "promotion_bottleneck",
        severity: "medium" as WorkforceGapSeverity,
        description: `${count}/${teachers.length} teachers clustered at "${stage}" stage`,
        recommendedIntervention: `Create differentiated growth plans to unblock advancement from ${stage}`,
      });
    }
  }

  return gaps.sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));
}

function severityOrder(s: WorkforceGapSeverity): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s];
}

function emptyProfile(schoolId: string): SchoolWorkforceProfile {
  return {
    schoolId,
    teacherCount: 0,
    verifiedTeacherCount: 0,
    averageReputationScore: 0,
    averageCriScore: 0,
    credentialCoverage: 0,
    careerStageDistribution: {},
    reputationDistribution: {},
    topGaps: [],
    promotionReadyCount: 0,
    workforceUpdatedAt: new Date().toISOString(),
  };
}
