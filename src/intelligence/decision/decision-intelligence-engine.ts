/**
 * Decision Intelligence Engine — Pure Functions
 *
 * Derives readiness breakdown, risk indicators, decision signals,
 * and comparison data from TalentIntelligenceProfile.
 * No DB calls. Deterministic. Explainable.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import type { TalentIntelligenceProfile } from "@/intelligence/talent/types/talent-intelligence.types";
import { computeCandidateRankingScore, type RankingExplanation } from "@/intelligence/talent/ranking/candidate-ranking";
import type {
  CandidateReadinessBreakdown,
  ReadinessDimension,
  CandidateRiskIndicators,
  HiringRiskIndicator,
  DecisionSupportSignals,
  DecisionSupportSignal,
  CandidateComparisonEntry,
  CandidateComparisonSummary,
  CandidateDecisionIntelligence,
  RiskSeverity,
} from "./types/decision-intelligence.types";

// ── Readiness Breakdown ────────────────────────────────────────

function scoreToDimensionLevel(score: number): "strong" | "moderate" | "weak" | "missing" {
  if (score >= 75) return "strong";
  if (score >= 50) return "moderate";
  if (score > 0) return "weak";
  return "missing";
}

export function buildReadinessBreakdown(profile: TalentIntelligenceProfile): CandidateReadinessBreakdown {
  const criNorm = Math.min(profile.criScore, 100);

  const dimensions: ReadinessDimension[] = [
    {
      key: "curriculum_readiness",
      label: "Curriculum Readiness",
      score: criNorm,
      level: scoreToDimensionLevel(criNorm),
      evidence: `CRI score: ${Math.round(criNorm)}`,
    },
    {
      key: "subject_mastery",
      label: "Subject Mastery",
      score: profile.bestMatchScore != null ? Math.min(profile.bestMatchScore, 100) : 0,
      level: scoreToDimensionLevel(profile.bestMatchScore ?? 0),
      evidence: profile.bestMatchScore != null ? `Best match: ${Math.round(profile.bestMatchScore)}` : "No match data",
    },
    {
      key: "teaching_practice",
      label: "Teaching Practice Verification",
      score: Math.min(profile.verifiedSignalCount * 20, 100),
      level: scoreToDimensionLevel(Math.min(profile.verifiedSignalCount * 20, 100)),
      evidence: `${profile.verifiedSignalCount} verified signal${profile.verifiedSignalCount !== 1 ? "s" : ""}`,
    },
    {
      key: "credential_strength",
      label: "Credential Strength",
      score: ({ none: 0, basic: 25, moderate: 50, strong: 75, exceptional: 100 })[profile.credentialStrength] ?? 0,
      level: scoreToDimensionLevel(({ none: 0, basic: 25, moderate: 50, strong: 75, exceptional: 100 })[profile.credentialStrength] ?? 0),
      evidence: `${profile.credentialCount} credential${profile.credentialCount !== 1 ? "s" : ""} (${profile.credentialStrength})`,
    },
    {
      key: "pathway_achievement",
      label: "Pathway Achievement",
      score: Math.min(profile.pathwayCompletionCount * 25, 100),
      level: scoreToDimensionLevel(Math.min(profile.pathwayCompletionCount * 25, 100)),
      evidence: `${profile.pathwayCompletionCount} completed, ${profile.activePathwayCount} active`,
    },
    {
      key: "growth_momentum",
      label: "Professional Growth Momentum",
      score: ({ inactive: 0, emerging: 25, active: 60, accelerating: 100 })[profile.growthMomentum] ?? 0,
      level: scoreToDimensionLevel(({ inactive: 0, emerging: 25, active: 60, accelerating: 100 })[profile.growthMomentum] ?? 0),
      evidence: `Growth: ${profile.growthMomentum}`,
    },
    {
      key: "competency_gaps",
      label: "Competency Gap Status",
      score: profile.unresolvedGapCount === 0 ? 100 : Math.max(0, 100 - profile.unresolvedGapCount * 25),
      level: profile.unresolvedGapCount === 0 ? "strong" : profile.unresolvedGapCount <= 2 ? "moderate" : "weak",
      evidence: profile.unresolvedGapCount === 0
        ? "No unresolved gaps"
        : `${profile.unresolvedGapCount} unresolved gap${profile.unresolvedGapCount !== 1 ? "s" : ""}`,
    },
  ];

  return {
    teacherId: profile.teacherId,
    overallReadiness: profile.readinessLevel,
    criScore: profile.criScore,
    dimensions,
  };
}

// ── Risk Indicators ────────────────────────────────────────────

export function buildRiskIndicators(profile: TalentIntelligenceProfile): CandidateRiskIndicators {
  const risks: HiringRiskIndicator[] = [];

  if (profile.verifiedSignalCount === 0) {
    risks.push({
      riskType: "missing_verified_evidence",
      severity: "high",
      label: "No Verified Classroom Evidence",
      explanation: "This teacher has no verified teaching artifacts or mentor-validated evidence.",
    });
  }

  if (profile.credentialStrength === "none") {
    risks.push({
      riskType: "missing_credential",
      severity: "high",
      label: "No Credentials",
      explanation: "This teacher has no earned professional credentials on file.",
    });
  }

  if (profile.unresolvedGapCount >= 3) {
    risks.push({
      riskType: "unresolved_gaps",
      severity: "high",
      label: `${profile.unresolvedGapCount} Unresolved Competency Gaps`,
      explanation: `Significant competency gaps remain in: ${profile.gapCategories.slice(0, 3).join(", ") || "multiple areas"}.`,
    });
  } else if (profile.unresolvedGapCount > 0) {
    risks.push({
      riskType: "unresolved_gaps",
      severity: "medium",
      label: `${profile.unresolvedGapCount} Unresolved Gap${profile.unresolvedGapCount > 1 ? "s" : ""}`,
      explanation: `Minor competency gaps in: ${profile.gapCategories.join(", ") || "some areas"}.`,
    });
  }

  if (profile.activePathwayCount > 0 && profile.pathwayCompletionCount === 0) {
    risks.push({
      riskType: "incomplete_pathway",
      severity: "low",
      label: "Pathways In Progress",
      explanation: "This teacher has active pathway enrollments but no completions yet.",
    });
  }

  if (profile.criScore < 40) {
    risks.push({
      riskType: "low_cri",
      severity: "medium",
      label: "Low Career Readiness",
      explanation: `CRI score is ${Math.round(profile.criScore)}, indicating early-stage readiness.`,
    });
  }

  if (profile.growthMomentum === "inactive") {
    risks.push({
      riskType: "no_growth_activity",
      severity: "low",
      label: "No Recent Growth Activity",
      explanation: "This teacher has no recent training completions or active learning paths.",
    });
  }

  const overallRiskLevel: RiskSeverity | "none" =
    risks.some((r) => r.severity === "high") ? "high"
    : risks.some((r) => r.severity === "medium") ? "medium"
    : risks.length > 0 ? "low"
    : "none";

  return { teacherId: profile.teacherId, risks, overallRiskLevel };
}

// ── Decision Support Signals ───────────────────────────────────

export function buildDecisionSignals(profile: TalentIntelligenceProfile): DecisionSupportSignals {
  const signals: DecisionSupportSignal[] = [];

  if (profile.criScore >= 71) {
    signals.push({
      type: "strong_curriculum_alignment",
      label: "Strong Curriculum Alignment",
      sentiment: "positive",
      detail: `CRI score of ${Math.round(profile.criScore)} indicates strong readiness.`,
    });
  }

  if (profile.verifiedSignalCount >= 2) {
    signals.push({
      type: "verified_classroom_practice",
      label: "Verified Classroom Practice",
      sentiment: "positive",
      detail: `${profile.verifiedSignalCount} verified teaching signals, including evidence and mentor validations.`,
    });
  }

  if (profile.credentialStrength === "strong" || profile.credentialStrength === "exceptional") {
    signals.push({
      type: "strong_credentials",
      label: `${profile.credentialStrength === "exceptional" ? "Exceptional" : "Strong"} Credentials`,
      sentiment: "positive",
      detail: `${profile.credentialCount} credentials (${profile.credentialVerifiedCount} verified).`,
    });
  }

  if (profile.growthMomentum === "active" || profile.growthMomentum === "accelerating") {
    signals.push({
      type: "recent_growth_activity",
      label: profile.growthMomentum === "accelerating" ? "Accelerating Growth" : "Active Learner",
      sentiment: "positive",
      detail: "Recent professional development activity demonstrates commitment to growth.",
    });
  }

  if (profile.bestMatchScore != null && profile.bestMatchScore >= 70) {
    signals.push({
      type: "high_match_score",
      label: "High Job Match",
      sentiment: "positive",
      detail: `Best match score: ${Math.round(profile.bestMatchScore)}.`,
    });
  }

  if (profile.pathwayCompletionCount > 0) {
    signals.push({
      type: "pathway_completion",
      label: "Professional Pathway Completed",
      sentiment: "positive",
      detail: `${profile.pathwayCompletionCount} pathway${profile.pathwayCompletionCount > 1 ? "s" : ""} completed.`,
    });
  }

  const hasMentorValidation = profile.hiringAdvantageSignals.some(
    (s: any) => s.type === "mentor_validated",
  );
  if (hasMentorValidation) {
    signals.push({
      type: "mentor_validated",
      label: "Mentor Validated",
      sentiment: "positive",
      detail: "Teaching practice has been validated by a professional mentor.",
    });
  }

  if (profile.unresolvedGapCount === 0 && profile.trainingCompletionCount > 0) {
    signals.push({
      type: "gap_free",
      label: "All Gaps Resolved",
      sentiment: "positive",
      detail: "No unresolved competency gaps identified.",
    });
  }

  return { teacherId: profile.teacherId, signals };
}

// ── Comparison ─────────────────────────────────────────────────

export function buildComparisonEntry(
  profile: TalentIntelligenceProfile,
  teacherName?: string,
): CandidateComparisonEntry {
  const rankingExplanation = computeCandidateRankingScore(profile);

  return {
    teacherId: profile.teacherId,
    teacherName,
    criScore: profile.criScore,
    matchScore: profile.bestMatchScore,
    verifiedSignalCount: profile.verifiedSignalCount,
    credentialStrength: profile.credentialStrength,
    pathwayCompletionCount: profile.pathwayCompletionCount,
    unresolvedGapCount: profile.unresolvedGapCount,
    growthMomentum: profile.growthMomentum,
    readinessLevel: profile.readinessLevel,
    rankingScore: rankingExplanation.totalScore,
    rankingExplanation,
  };
}

export function buildComparisonSummary(
  profiles: { profile: TalentIntelligenceProfile; name?: string }[],
): CandidateComparisonSummary {
  return {
    candidates: profiles.map((p) => buildComparisonEntry(p.profile, p.name)),
    dimensions: [
      "criScore",
      "matchScore",
      "verifiedSignalCount",
      "credentialStrength",
      "pathwayCompletionCount",
      "unresolvedGapCount",
      "growthMomentum",
      "readinessLevel",
      "rankingScore",
    ],
  };
}

// ── Full Decision Intelligence Bundle ──────────────────────────

export function buildCandidateDecisionIntelligence(
  profile: TalentIntelligenceProfile,
): CandidateDecisionIntelligence {
  return {
    readiness: buildReadinessBreakdown(profile),
    risks: buildRiskIndicators(profile),
    decisionSignals: buildDecisionSignals(profile),
    rankingExplanation: computeCandidateRankingScore(profile),
  };
}
