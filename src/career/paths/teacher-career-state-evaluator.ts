/**
 * Teacher Career State Evaluator — Sprint 8A
 *
 * Determines the teacher's current stage, next stage, and readiness.
 * Pure function — consumes pre-loaded path data and teacher signals.
 */

import type {
  CareerPath,
  CareerStage,
  CareerStageRequirement,
  TeacherCareerSignals,
  TeacherCareerState,
  CareerStageGapReport,
  CareerStateTrace,
  StageEvaluationSummary,
} from "./career-path.types";
import { evaluateStage } from "./career-stage-requirement-engine";

export interface CareerPathData {
  path: CareerPath;
  stages: CareerStage[];
  requirements: CareerStageRequirement[];
}

/**
 * Evaluate the teacher's current position on a specific career path.
 * Walks stages in order; the highest fully-satisfied stage is "current".
 */
export function evaluateTeacherCareerState(
  pathData: CareerPathData,
  signals: TeacherCareerSignals,
): TeacherCareerState {
  const { path, stages, requirements } = pathData;
  const orderedStages = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);

  const stageEvaluations = orderedStages.map((stage) =>
    evaluateStage(stage, requirements, signals),
  );

  // Find the highest stage where all mandatory requirements are met
  let currentStageIndex = -1;
  for (let i = 0; i < stageEvaluations.length; i++) {
    if (stageEvaluations[i].allMandatorySatisfied) {
      currentStageIndex = i;
    } else {
      break; // Stop at the first unsatisfied stage
    }
  }

  const currentStage = currentStageIndex >= 0 ? orderedStages[currentStageIndex] : null;
  const nextStageIndex = currentStageIndex + 1;
  const nextStage = nextStageIndex < orderedStages.length ? orderedStages[nextStageIndex] : null;

  // Readiness is for the next stage
  const nextStageEval = nextStage ? stageEvaluations[nextStageIndex] : null;
  const readinessPercent = nextStageEval?.readinessPercent ?? 100;

  const unmetCount = nextStageEval
    ? nextStageEval.requirementEvaluations.filter((e) => !e.satisfied).length
    : 0;
  const satisfiedCount = nextStageEval
    ? nextStageEval.requirementEvaluations.filter((e) => e.satisfied).length
    : 0;
  const totalCount = nextStageEval?.requirementEvaluations.length ?? 0;

  const summaries: StageEvaluationSummary[] = stageEvaluations.map((se) => ({
    stageSlug: se.stage.slug,
    stageName: se.stage.name,
    allMet: se.allMandatorySatisfied,
    readinessPercent: se.readinessPercent,
  }));

  const signalsUsed: string[] = [];
  if (signals.experienceYears > 0) signalsUsed.push("experience");
  if (signals.credentialSourceIds.length > 0) signalsUsed.push("credentials");
  if (signals.certificationTermIds.length > 0) signalsUsed.push("certifications");
  if (signals.verifiedCompletionCount > 0) signalsUsed.push("verified_completions");
  if (signals.pathwayCompletionCount > 0) signalsUsed.push("pathway_completions");
  if (signals.approvedEvidenceCount > 0) signalsUsed.push("approved_evidence");
  if (signals.trustVerified) signalsUsed.push("trust");

  const trace: CareerStateTrace = {
    pathSlug: path.slug,
    currentStageSlug: currentStage?.slug,
    nextStageSlug: nextStage?.slug,
    stageEvaluations: summaries,
    signalsUsed,
    computedAt: new Date().toISOString(),
  };

  return {
    teacherId: signals.teacherId,
    currentPathId: path.id,
    currentStageId: currentStage?.id ?? null,
    nextStageId: nextStage?.id ?? null,
    readinessPercent,
    unmetRequirementCount: unmetCount,
    satisfiedRequirementCount: satisfiedCount,
    totalRequirementCount: totalCount,
    evaluationTrace: trace,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Generate a gap report for progressing to a target stage.
 */
export function generateStageGapReport(
  pathData: CareerPathData,
  signals: TeacherCareerSignals,
  targetStageId: string,
): CareerStageGapReport | null {
  const { stages, requirements } = pathData;
  const targetStage = stages.find((s) => s.id === targetStageId);
  if (!targetStage) return null;

  const evaluation = evaluateStage(targetStage, requirements, signals);

  const unmet = evaluation.requirementEvaluations.filter((e) => !e.satisfied);
  const satisfied = evaluation.requirementEvaluations.filter((e) => e.satisfied);

  // Determine current stage for context
  const orderedStages = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
  const stageEvals = orderedStages.map((s) => evaluateStage(s, requirements, signals));
  let currentStageIdx = -1;
  for (let i = 0; i < stageEvals.length; i++) {
    if (stageEvals[i].allMandatorySatisfied) currentStageIdx = i;
    else break;
  }
  const currentStage = currentStageIdx >= 0 ? orderedStages[currentStageIdx] : null;

  const nextActions = unmet.map((u) => {
    switch (u.requirement.requirementType) {
      case "credential":
        return `Earn required credential: ${u.requirement.requirementLabel}`;
      case "certification":
        return `Obtain certification: ${u.requirement.requirementLabel}`;
      case "verified_evidence":
        return `Submit and get ${u.requirement.minCount} evidence items verified`;
      case "pathway_completion":
        return `Complete ${u.requirement.minCount} professional pathway(s)`;
      case "training_completion":
        return `Complete ${u.requirement.minCount} training course(s)`;
      case "experience_years":
        return `Gain ${u.requirement.minExperienceYears ?? u.requirement.minCount} years of experience`;
      case "trust_verification":
        return "Complete trust verification process";
      case "language":
        return `Meet language requirement: ${u.requirement.requirementLabel}`;
      case "competency":
        return `Demonstrate competency: ${u.requirement.requirementLabel}`;
      default:
        return `Satisfy requirement: ${u.requirement.requirementLabel}`;
    }
  });

  return {
    currentStage,
    targetStage,
    unmetRequirements: unmet,
    satisfiedRequirements: satisfied,
    readinessPercent: evaluation.readinessPercent,
    nextActions,
  };
}
