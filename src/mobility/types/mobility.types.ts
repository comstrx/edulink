/**
 * Career Mobility Engine — Core Types — Sprint 8C
 */

export interface MobilityTrack {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface MobilityTarget {
  id: string;
  trackId: string;
  trackName?: string;
  name: string;
  slug: string;
  description?: string;
  targetRole?: string;
  targetCurriculumTermIds: string[];
  targetSchoolTypeTermIds: string[];
  targetCareerStageId?: string;
}

export interface MobilityRequirement {
  id: string;
  targetId: string;
  requirementType: MobilityRequirementType;
  requirementKey: string;
  requirementLabel: string;
  isMandatory: boolean;
  minCount?: number;
  minReputationScore?: number;
  minExperienceYears?: number;
  termIds: string[];
  metadata: Record<string, unknown>;
}

export type MobilityRequirementType =
  | "credential"
  | "career_stage"
  | "reputation_threshold"
  | "verified_evidence"
  | "curriculum_experience"
  | "pathway_completion"
  | "language"
  | "experience_years"
  | "training_completion";

export interface MobilityRequirementEvaluation {
  requirement: MobilityRequirement;
  satisfied: boolean;
  explanation: string;
}

export interface MobilityEvaluationResult {
  targetId: string;
  targetName: string;
  trackName: string;
  readinessPercent: number;
  satisfiedCount: number;
  totalCount: number;
  gapCount: number;
  satisfiedRequirements: MobilityRequirementEvaluation[];
  unmetRequirements: MobilityRequirementEvaluation[];
  blockingRequirements: MobilityRequirementEvaluation[];
}

export interface MobilityGapReport {
  teacherId: string;
  targetId: string;
  targetName: string;
  missingCredentials: string[];
  missingPathways: string[];
  missingEvidence: string[];
  insufficientExperience: string[];
  insufficientReputation: string[];
  recommendedActions: string[];
}

export interface TeacherMobilityState {
  teacherId: string;
  targetId: string;
  targetName: string;
  trackName: string;
  readinessPercent: number;
  gapCount: number;
  blockingGaps: Array<{ key: string; label: string }>;
  lastEvaluated: string;
}

/** Mobility signal for hiring/discovery consumption */
export interface MobilitySignal {
  key: string;
  label: string;
  readinessPercent: number;
  active: boolean;
}
