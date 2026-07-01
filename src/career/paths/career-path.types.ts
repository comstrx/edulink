/**
 * Career Path Types — Sprint 8A
 *
 * Domain model for structured career progression.
 */

// ── Requirement Types ──────────────────────────────────────────

export type StageRequirementType =
  | "credential"
  | "verified_evidence"
  | "pathway_completion"
  | "competency"
  | "trust_verification"
  | "experience_years"
  | "language"
  | "certification"
  | "training_completion";

// ── Path & Stage ───────────────────────────────────────────────

export interface CareerPath {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CareerStage {
  id: string;
  pathId: string;
  slug: string;
  name: string;
  description: string | null;
  stageOrder: number;
  isActive: boolean;
}

export interface CareerStageRequirement {
  id: string;
  stageId: string;
  requirementType: StageRequirementType;
  requirementKey: string;
  requirementLabel: string;
  termIds: string[];
  minCount: number;
  minExperienceYears: number | null;
  isMandatory: boolean;
  metadata: Record<string, unknown>;
}

// ── Evaluation Results ─────────────────────────────────────────

export interface RequirementEvaluation {
  requirement: CareerStageRequirement;
  satisfied: boolean;
  currentCount: number;
  explanation: string;
}

export interface StageEvaluationResult {
  stage: CareerStage;
  requirementEvaluations: RequirementEvaluation[];
  satisfiedCount: number;
  totalMandatory: number;
  allMandatorySatisfied: boolean;
  readinessPercent: number;
}

export interface CareerStageGapReport {
  currentStage: CareerStage | null;
  targetStage: CareerStage;
  unmetRequirements: RequirementEvaluation[];
  satisfiedRequirements: RequirementEvaluation[];
  readinessPercent: number;
  nextActions: string[];
}

// ── Teacher Career State ───────────────────────────────────────

export interface TeacherCareerState {
  teacherId: string;
  currentPathId: string | null;
  currentStageId: string | null;
  nextStageId: string | null;
  readinessPercent: number;
  unmetRequirementCount: number;
  satisfiedRequirementCount: number;
  totalRequirementCount: number;
  evaluationTrace: CareerStateTrace;
  computedAt: string;
}

export interface CareerStateTrace {
  pathSlug?: string;
  currentStageSlug?: string;
  nextStageSlug?: string;
  stageEvaluations?: StageEvaluationSummary[];
  signalsUsed: string[];
  computedAt: string;
}

export interface StageEvaluationSummary {
  stageSlug: string;
  stageName: string;
  allMet: boolean;
  readinessPercent: number;
}

// ── Teacher Career Goal ────────────────────────────────────────

export interface TeacherCareerGoal {
  id: string;
  teacherId: string;
  targetPathId: string;
  targetStageId: string;
  goalStatus: "active" | "completed" | "paused" | "abandoned";
  createdAt: string;
  updatedAt: string;
}

// ── Teacher Signals (input to evaluator) ───────────────────────

export interface TeacherCareerSignals {
  teacherId: string;
  experienceYears: number;
  credentialSourceIds: string[];
  certificationTermIds: string[];
  verifiedCompletionCount: number;
  pathwayCompletionCount: number;
  trainingCompletionCount: number;
  approvedEvidenceCount: number;
  languageTermIds: string[];
  competencyTermIds: string[];
  verifiedSignalCount: number;
  trustVerified: boolean;
}
