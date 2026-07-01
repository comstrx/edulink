/**
 * Career Stage Requirement Engine — Sprint 8A
 *
 * Evaluates whether a teacher satisfies stage requirements
 * using existing system signals. Pure function — no DB calls.
 */

import type {
  CareerStageRequirement,
  RequirementEvaluation,
  StageEvaluationResult,
  CareerStage,
  TeacherCareerSignals,
} from "./career-path.types";

/**
 * Evaluate a single requirement against teacher signals.
 */
export function evaluateRequirement(
  req: CareerStageRequirement,
  signals: TeacherCareerSignals,
): RequirementEvaluation {
  switch (req.requirementType) {
    case "experience_years": {
      const needed = req.minExperienceYears ?? req.minCount;
      const satisfied = signals.experienceYears >= needed;
      return {
        requirement: req,
        satisfied,
        currentCount: signals.experienceYears,
        explanation: satisfied
          ? `Has ${signals.experienceYears} years experience (need ${needed})`
          : `Only ${signals.experienceYears} years experience (need ${needed})`,
      };
    }

    case "credential": {
      const matchCount = req.termIds.length > 0
        ? req.termIds.filter((t) => signals.credentialSourceIds.includes(t)).length
        : signals.credentialSourceIds.length;
      const satisfied = matchCount >= req.minCount;
      return {
        requirement: req,
        satisfied,
        currentCount: matchCount,
        explanation: satisfied
          ? `Has ${matchCount}/${req.minCount} required credentials`
          : `Missing credentials: ${matchCount}/${req.minCount}`,
      };
    }

    case "certification": {
      const matchCount = req.termIds.length > 0
        ? req.termIds.filter((t) => signals.certificationTermIds.includes(t)).length
        : signals.certificationTermIds.length;
      const satisfied = matchCount >= req.minCount;
      return {
        requirement: req,
        satisfied,
        currentCount: matchCount,
        explanation: satisfied
          ? `Has ${matchCount}/${req.minCount} required certifications`
          : `Missing certifications: ${matchCount}/${req.minCount}`,
      };
    }

    case "verified_evidence": {
      const satisfied = signals.approvedEvidenceCount >= req.minCount;
      return {
        requirement: req,
        satisfied,
        currentCount: signals.approvedEvidenceCount,
        explanation: satisfied
          ? `Has ${signals.approvedEvidenceCount} verified evidence items`
          : `Need ${req.minCount} verified evidence, have ${signals.approvedEvidenceCount}`,
      };
    }

    case "pathway_completion": {
      const satisfied = signals.pathwayCompletionCount >= req.minCount;
      return {
        requirement: req,
        satisfied,
        currentCount: signals.pathwayCompletionCount,
        explanation: satisfied
          ? `Completed ${signals.pathwayCompletionCount} pathways`
          : `Need ${req.minCount} pathway completions, have ${signals.pathwayCompletionCount}`,
      };
    }

    case "training_completion": {
      const satisfied = signals.trainingCompletionCount >= req.minCount;
      return {
        requirement: req,
        satisfied,
        currentCount: signals.trainingCompletionCount,
        explanation: satisfied
          ? `Completed ${signals.trainingCompletionCount} training items`
          : `Need ${req.minCount} training completions, have ${signals.trainingCompletionCount}`,
      };
    }

    case "competency": {
      const matchCount = req.termIds.length > 0
        ? req.termIds.filter((t) => signals.competencyTermIds.includes(t)).length
        : 0;
      const satisfied = matchCount >= req.minCount;
      return {
        requirement: req,
        satisfied,
        currentCount: matchCount,
        explanation: satisfied
          ? `Has ${matchCount}/${req.minCount} required competencies`
          : `Missing competencies: ${matchCount}/${req.minCount}`,
      };
    }

    case "trust_verification": {
      const satisfied = signals.trustVerified;
      return {
        requirement: req,
        satisfied,
        currentCount: satisfied ? 1 : 0,
        explanation: satisfied
          ? "Trust verification complete"
          : "Trust verification incomplete",
      };
    }

    case "language": {
      const matchCount = req.termIds.length > 0
        ? req.termIds.filter((t) => signals.languageTermIds.includes(t)).length
        : signals.languageTermIds.length;
      const satisfied = matchCount >= req.minCount;
      return {
        requirement: req,
        satisfied,
        currentCount: matchCount,
        explanation: satisfied
          ? `Has ${matchCount}/${req.minCount} required languages`
          : `Missing languages: ${matchCount}/${req.minCount}`,
      };
    }

    default:
      return {
        requirement: req,
        satisfied: false,
        currentCount: 0,
        explanation: `Unknown requirement type: ${req.requirementType}`,
      };
  }
}

/**
 * Evaluate all requirements for a stage.
 */
export function evaluateStage(
  stage: CareerStage,
  requirements: CareerStageRequirement[],
  signals: TeacherCareerSignals,
): StageEvaluationResult {
  const stageReqs = requirements.filter((r) => r.stageId === stage.id);
  const evaluations = stageReqs.map((r) => evaluateRequirement(r, signals));

  const mandatoryEvals = evaluations.filter((e) => e.requirement.isMandatory);
  const satisfiedMandatory = mandatoryEvals.filter((e) => e.satisfied).length;
  const totalMandatory = mandatoryEvals.length;

  const allSatisfied = evaluations.filter((e) => e.satisfied).length;
  const total = evaluations.length;

  return {
    stage,
    requirementEvaluations: evaluations,
    satisfiedCount: satisfiedMandatory,
    totalMandatory,
    allMandatorySatisfied: totalMandatory === 0 || satisfiedMandatory === totalMandatory,
    readinessPercent: total === 0 ? 100 : Math.round((allSatisfied / total) * 100),
  };
}
