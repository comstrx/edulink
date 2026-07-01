/**
 * School Decision Intelligence — Type Definitions
 *
 * Structured models for readiness breakdown, hiring risks,
 * candidate comparison, and decision support signals.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import type { RankingExplanation } from "@/intelligence/talent/ranking/candidate-ranking";
import type { CredentialStrength, GrowthMomentum, ReadinessLevel } from "@/intelligence/talent/types/talent-intelligence.types";

// ── Readiness Dimension ────────────────────────────────────────

export type ReadinessDimensionKey =
  | "curriculum_readiness"
  | "subject_mastery"
  | "teaching_practice"
  | "credential_strength"
  | "pathway_achievement"
  | "growth_momentum"
  | "competency_gaps";

export interface ReadinessDimension {
  key: ReadinessDimensionKey;
  label: string;
  score: number; // 0–100
  level: "strong" | "moderate" | "weak" | "missing";
  evidence: string;
}

export interface CandidateReadinessBreakdown {
  teacherId: string;
  overallReadiness: ReadinessLevel;
  criScore: number;
  dimensions: ReadinessDimension[];
}

// ── Risk Indicators ────────────────────────────────────────────

export type RiskType =
  | "missing_verified_evidence"
  | "missing_credential"
  | "unresolved_gaps"
  | "incomplete_pathway"
  | "weak_curriculum"
  | "low_cri"
  | "no_growth_activity";

export type RiskSeverity = "low" | "medium" | "high";

export interface HiringRiskIndicator {
  riskType: RiskType;
  severity: RiskSeverity;
  label: string;
  explanation: string;
}

export interface CandidateRiskIndicators {
  teacherId: string;
  risks: HiringRiskIndicator[];
  overallRiskLevel: RiskSeverity | "none";
}

// ── Decision Support Signals ───────────────────────────────────

export type DecisionSignalType =
  | "strong_curriculum_alignment"
  | "verified_classroom_practice"
  | "strong_credentials"
  | "recent_growth_activity"
  | "high_match_score"
  | "pathway_completion"
  | "mentor_validated"
  | "gap_free";

export interface DecisionSupportSignal {
  type: DecisionSignalType;
  label: string;
  sentiment: "positive" | "neutral" | "caution";
  detail: string;
}

export interface DecisionSupportSignals {
  teacherId: string;
  signals: DecisionSupportSignal[];
}

// ── Candidate Comparison ───────────────────────────────────────

export interface CandidateComparisonEntry {
  teacherId: string;
  teacherName?: string;
  criScore: number;
  matchScore: number | null;
  verifiedSignalCount: number;
  credentialStrength: CredentialStrength;
  pathwayCompletionCount: number;
  unresolvedGapCount: number;
  growthMomentum: GrowthMomentum;
  readinessLevel: ReadinessLevel;
  rankingScore: number;
  rankingExplanation: RankingExplanation;
}

export interface CandidateComparisonSummary {
  candidates: CandidateComparisonEntry[];
  dimensions: (keyof Omit<CandidateComparisonEntry, "teacherId" | "teacherName" | "rankingExplanation">)[];
}

// ── Full Decision Intelligence Bundle ──────────────────────────

export interface CandidateDecisionIntelligence {
  readiness: CandidateReadinessBreakdown;
  risks: CandidateRiskIndicators;
  decisionSignals: DecisionSupportSignals;
  rankingExplanation: RankingExplanation;
}
