/**
 * Workforce Explainability Builder — Sprint 4
 *
 * Derives structured explainability from existing workforce aggregation outputs.
 * No new logic — only interprets what the aggregator already computed.
 */

import type {
  SchoolWorkforceProfile,
  DepartmentCapability,
  WorkforceGap,
  PromotionReadinessEntry,
  TeacherWorkforceSignals,
} from "../types/workforce.types";
import type {
  WorkforceExplainabilityBundle,
  WorkforceProfileExplainability,
  DepartmentExplainability,
  GapExplainability,
  PromotionExplainability,
  WorkforceSignalContribution,
} from "./workforce-explainability.types";

// ── Profile Explainability ──────────────────────────────────────

export function buildProfileExplainability(
  profile: SchoolWorkforceProfile,
  teachers: TeacherWorkforceSignals[],
): WorkforceProfileExplainability {
  const signals: WorkforceSignalContribution[] = [
    { type: "team_size", label: "Team Size", value: profile.teacherCount },
    { type: "reputation", label: "Average Reputation", value: profile.averageReputationScore },
    { type: "cri", label: "Average Readiness Index", value: profile.averageCriScore },
    { type: "credentials", label: "Credential Coverage", value: `${profile.credentialCoverage}%` },
    { type: "verification", label: "Verified Teachers", value: profile.verifiedTeacherCount },
  ];

  const keyDrivers: string[] = [];

  if (profile.credentialCoverage < 30) {
    keyDrivers.push("Low credential coverage across the team");
  }
  if (profile.averageReputationScore < 20) {
    keyDrivers.push("Below-average professional reputation scores");
  }
  if (profile.promotionReadyCount === 0 && profile.teacherCount >= 3) {
    keyDrivers.push("No teachers currently ready for career advancement");
  }
  if (profile.verifiedTeacherCount === 0 && profile.teacherCount > 0) {
    keyDrivers.push("No teachers with verified professional evidence");
  }
  if (keyDrivers.length === 0) {
    keyDrivers.push("Team shows balanced professional development signals");
  }

  const summary = profile.teacherCount === 0
    ? "No team members found — workforce profile is empty"
    : `Workforce profile based on ${profile.teacherCount} teachers with ${profile.credentialCoverage}% credential coverage and an average reputation of ${profile.averageReputationScore}`;

  return {
    summary,
    keyDrivers,
    signals,
    teamSize: profile.teacherCount,
    computedAt: profile.workforceUpdatedAt,
  };
}

// ── Department Explainability ───────────────────────────────────

export function buildDepartmentExplainability(
  dept: DepartmentCapability,
): DepartmentExplainability {
  const signals: WorkforceSignalContribution[] = [
    { type: "team_size", label: "Department Size", value: dept.teacherCount },
    { type: "reputation", label: "Average Reputation", value: dept.averageReputationScore },
    { type: "cri", label: "Average Readiness Index", value: dept.averageCriScore },
    { type: "credentials", label: "Credential Coverage", value: `${dept.credentialCoverage}%` },
    { type: "verification", label: "Verified Staff", value: dept.verifiedCount },
  ];

  const keyDrivers: string[] = [];

  if (dept.gapScore >= 70) {
    keyDrivers.push("High capability gap — most staff lack credentials or verified evidence");
  } else if (dept.gapScore >= 40) {
    keyDrivers.push("Moderate capability gap — some professional development areas need attention");
  } else {
    keyDrivers.push("Department shows strong professional capability coverage");
  }

  if (dept.verifiedCount === 0 && dept.teacherCount > 0) {
    keyDrivers.push("No verified staff in this department");
  }

  const summary = `${dept.departmentLabel}: ${dept.teacherCount} teachers, gap score ${dept.gapScore}/100`;

  return { summary, keyDrivers, signals };
}

// ── Gap Explainability ──────────────────────────────────────────

const GAP_TRIGGER_DESCRIPTIONS: Record<string, string> = {
  low_credential_coverage: "Credential coverage fell below the 30% threshold",
  low_verified_evidence: "Verified evidence ratio fell below the 40% threshold",
  no_leadership_pipeline: "No teachers have readiness above 70% with 3+ team members",
  low_reputation_average: "Average reputation score fell below 20",
  promotion_bottleneck: "More than 60% of teachers are clustered at the same career stage",
  insufficient_qualified_teachers: "Insufficient qualified teachers for required roles",
  curriculum_coverage_gap: "Required curriculum areas lack qualified teaching staff",
};

export function buildGapExplainability(
  gap: WorkforceGap,
  profile: SchoolWorkforceProfile,
): GapExplainability {
  const contributingSignals: WorkforceSignalContribution[] = [];

  if (gap.gapType === "low_credential_coverage") {
    contributingSignals.push({ type: "credentials", label: "Credential Coverage", value: `${profile.credentialCoverage}%` });
  }
  if (gap.gapType === "low_reputation_average") {
    contributingSignals.push({ type: "reputation", label: "Average Reputation", value: profile.averageReputationScore });
  }
  if (gap.gapType === "no_leadership_pipeline") {
    contributingSignals.push({ type: "career_stage", label: "Promotion-Ready Count", value: profile.promotionReadyCount });
    contributingSignals.push({ type: "team_size", label: "Team Size", value: profile.teacherCount });
  }
  if (gap.gapType === "low_verified_evidence") {
    contributingSignals.push({ type: "verification", label: "Verified Teachers", value: profile.verifiedTeacherCount });
    contributingSignals.push({ type: "team_size", label: "Team Size", value: profile.teacherCount });
  }
  if (gap.gapType === "promotion_bottleneck") {
    contributingSignals.push({ type: "career_stage", label: "Stage Distribution", value: JSON.stringify(profile.careerStageDistribution) });
  }

  return {
    summary: gap.description,
    triggerCondition: GAP_TRIGGER_DESCRIPTIONS[gap.gapType] ?? "Threshold condition met",
    contributingSignals,
  };
}

// ── Promotion Explainability ────────────────────────────────────

export function buildPromotionExplainability(
  pipeline: PromotionReadinessEntry[],
  teacherCount: number,
): PromotionExplainability {
  if (pipeline.length === 0) {
    if (teacherCount === 0) {
      return { summary: "No team members — promotion pipeline is empty", keyDrivers: [] };
    }
    return {
      summary: "No teachers currently in the promotion pipeline",
      keyDrivers: ["No teachers have both readiness above 0% and an identified next career stage"],
    };
  }

  const readyCount = pipeline.filter((p) => p.readinessPercent >= 70).length;
  const avgReadiness = Math.round(pipeline.reduce((s, p) => s + p.readinessPercent, 0) / pipeline.length);

  const keyDrivers: string[] = [];
  if (readyCount > 0) {
    keyDrivers.push(`${readyCount} teacher(s) at 70%+ readiness for advancement`);
  }
  if (avgReadiness < 40) {
    keyDrivers.push("Average pipeline readiness is below 40% — most teachers need further development");
  }

  const blockedCount = pipeline.filter((p) => p.gapCount > 0).length;
  if (blockedCount > 0) {
    keyDrivers.push(`${blockedCount} teacher(s) have unmet requirements blocking advancement`);
  }

  return {
    summary: `${pipeline.length} teachers in promotion pipeline with ${avgReadiness}% average readiness`,
    keyDrivers,
  };
}

// ── Full Bundle Builder ─────────────────────────────────────────

export function buildWorkforceExplainability(
  profile: SchoolWorkforceProfile,
  departments: DepartmentCapability[],
  gaps: WorkforceGap[],
  promotionPipeline: PromotionReadinessEntry[],
  teachers: TeacherWorkforceSignals[],
): WorkforceExplainabilityBundle {
  const deptExplainability: Record<string, DepartmentExplainability> = {};
  for (const dept of departments) {
    deptExplainability[dept.departmentKey] = buildDepartmentExplainability(dept);
  }

  return {
    profile: buildProfileExplainability(profile, teachers),
    departments: deptExplainability,
    gaps: gaps.map((g) => buildGapExplainability(g, profile)),
    promotionPipeline: buildPromotionExplainability(promotionPipeline, profile.teacherCount),
  };
}
