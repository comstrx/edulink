/**
 * Institutional Workforce Intelligence — Core Types
 * Sprint 8D + Sprint 4 (explainability)
 */

import type { WorkforceExplainabilityBundle } from "../explainability/workforce-explainability.types";

export type WorkforceGapSeverity = "low" | "medium" | "high" | "critical";

export type WorkforceGapType =
  | "insufficient_qualified_teachers"
  | "low_credential_coverage"
  | "low_verified_evidence"
  | "no_leadership_pipeline"
  | "low_reputation_average"
  | "curriculum_coverage_gap"
  | "promotion_bottleneck";

export interface SchoolWorkforceProfile {
  schoolId: string;
  teacherCount: number;
  verifiedTeacherCount: number;
  averageReputationScore: number;
  averageCriScore: number;
  credentialCoverage: number;
  careerStageDistribution: Record<string, number>;
  reputationDistribution: Record<string, number>;
  topGaps: WorkforceGap[];
  promotionReadyCount: number;
  workforceUpdatedAt: string;
}

export interface DepartmentCapability {
  departmentKey: string;
  departmentLabel: string;
  teacherCount: number;
  averageReputationScore: number;
  averageCriScore: number;
  verifiedCount: number;
  credentialCoverage: number;
  stageDistribution: Record<string, number>;
  gapScore: number;
}

export interface WorkforceGap {
  gapType: WorkforceGapType;
  severity: WorkforceGapSeverity;
  affectedDepartment?: string;
  description: string;
  recommendedIntervention?: string;
}

export interface PromotionReadinessEntry {
  teacherId: string;
  teacherName?: string;
  currentStage?: string;
  nextStage?: string;
  readinessPercent: number;
  gapCount: number;
  blockingGaps: Array<{ key: string; label: string }>;
}

/** Aggregation input per teacher for workforce computation */
export interface TeacherWorkforceSignals {
  teacherId: string;
  teacherName: string;
  subjectTermIds: string[];
  curriculumTermIds: string[];
  careerStageName?: string;
  reputationScore: number;
  reputationTier: string;
  criScore: number;
  credentialCount: number;
  verifiedCompletionCount: number;
  readinessPercent: number;
  nextStageName?: string;
  gapCount: number;
  blockingGaps: Array<{ key: string; label: string }>;
}

/** Summary for school-facing consumption */
export interface WorkforceInsightSummary {
  profile: SchoolWorkforceProfile;
  departments: DepartmentCapability[];
  promotionPipeline: PromotionReadinessEntry[];
  gaps: WorkforceGap[];
  explainability?: WorkforceExplainabilityBundle;
}
