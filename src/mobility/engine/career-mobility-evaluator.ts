/**
 * Career Mobility Evaluator — Sprint 8C
 *
 * Evaluates teacher readiness for mobility targets using
 * multi-signal analysis from career stage, reputation, credentials,
 * verified evidence, curriculum experience, and intelligence profile.
 *
 * Pipeline: Load Signals → Evaluate Requirements → Score → Persist
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  MobilityTarget,
  MobilityRequirement,
  MobilityRequirementEvaluation,
  MobilityEvaluationResult,
  MobilityGapReport,
} from "../types/mobility.types";

/** Signals assembled for evaluation */
export interface MobilitySignals {
  teacherId: string;
  careerStageId?: string;
  reputationScore: number;
  credibilityTier: string;
  credentialTermIds: string[];
  verifiedEvidenceCount: number;
  completedPathwayIds: string[];
  completedTrainingCount: number;
  curriculumTermIds: string[];
  experienceYears: number;
  languageTermIds: string[];
}

/**
 * Evaluate a single requirement against teacher signals
 */
export function evaluateMobilityRequirement(
  req: MobilityRequirement,
  signals: MobilitySignals,
): MobilityRequirementEvaluation {
  switch (req.requirementType) {
    case "credential": {
      const hasAll = req.termIds.length === 0 ||
        req.termIds.every((t) => signals.credentialTermIds.includes(t));
      return {
        requirement: req,
        satisfied: hasAll,
        explanation: hasAll
          ? `Has required credential(s)`
          : `Missing credential: ${req.requirementLabel}`,
      };
    }

    case "career_stage": {
      const met = !!signals.careerStageId && req.termIds.includes(signals.careerStageId);
      return {
        requirement: req,
        satisfied: met,
        explanation: met
          ? `At required career stage`
          : `Not yet at required career stage: ${req.requirementLabel}`,
      };
    }

    case "reputation_threshold": {
      const minScore = req.minReputationScore ?? 0;
      const met = signals.reputationScore >= minScore;
      return {
        requirement: req,
        satisfied: met,
        explanation: met
          ? `Reputation score ${signals.reputationScore} ≥ ${minScore}`
          : `Reputation score ${signals.reputationScore} < required ${minScore}`,
      };
    }

    case "verified_evidence": {
      const minCount = req.minCount ?? 1;
      const met = signals.verifiedEvidenceCount >= minCount;
      return {
        requirement: req,
        satisfied: met,
        explanation: met
          ? `Has ${signals.verifiedEvidenceCount} verified evidence items`
          : `Need ${minCount - signals.verifiedEvidenceCount} more verified evidence`,
      };
    }

    case "curriculum_experience": {
      const hasAll = req.termIds.length === 0 ||
        req.termIds.some((t) => signals.curriculumTermIds.includes(t));
      return {
        requirement: req,
        satisfied: hasAll,
        explanation: hasAll
          ? `Has curriculum experience`
          : `Missing curriculum experience: ${req.requirementLabel}`,
      };
    }

    case "pathway_completion": {
      const hasAll = req.termIds.length === 0 ||
        req.termIds.some((t) => signals.completedPathwayIds.includes(t));
      return {
        requirement: req,
        satisfied: hasAll,
        explanation: hasAll
          ? `Completed required pathway`
          : `Missing pathway: ${req.requirementLabel}`,
      };
    }

    case "language": {
      const hasAll = req.termIds.length === 0 ||
        req.termIds.some((t) => signals.languageTermIds.includes(t));
      return {
        requirement: req,
        satisfied: hasAll,
        explanation: hasAll
          ? `Has required language`
          : `Missing language: ${req.requirementLabel}`,
      };
    }

    case "experience_years": {
      const minYears = req.minExperienceYears ?? 0;
      const met = signals.experienceYears >= minYears;
      return {
        requirement: req,
        satisfied: met,
        explanation: met
          ? `${signals.experienceYears} years experience ≥ ${minYears}`
          : `Need ${minYears - signals.experienceYears} more years experience`,
      };
    }

    case "training_completion": {
      const minCount = req.minCount ?? 1;
      const met = signals.completedTrainingCount >= minCount;
      return {
        requirement: req,
        satisfied: met,
        explanation: met
          ? `Completed ${signals.completedTrainingCount} training items`
          : `Need ${minCount - signals.completedTrainingCount} more training completions`,
      };
    }

    default:
      return {
        requirement: req,
        satisfied: false,
        explanation: `Unknown requirement type: ${req.requirementType}`,
      };
  }
}

/**
 * Evaluate readiness for a specific mobility target
 */
export function evaluateMobilityTarget(
  target: MobilityTarget,
  requirements: MobilityRequirement[],
  signals: MobilitySignals,
): MobilityEvaluationResult {
  const evaluations = requirements.map((r) => evaluateMobilityRequirement(r, signals));

  const satisfied = evaluations.filter((e) => e.satisfied);
  const unmet = evaluations.filter((e) => !e.satisfied);
  const blocking = unmet.filter((e) => e.requirement.isMandatory);

  const total = evaluations.length;
  const readiness = total > 0 ? Math.round((satisfied.length / total) * 100) : 0;

  return {
    targetId: target.id,
    targetName: target.name,
    trackName: target.trackName ?? "",
    readinessPercent: readiness,
    satisfiedCount: satisfied.length,
    totalCount: total,
    gapCount: unmet.length,
    satisfiedRequirements: satisfied,
    unmetRequirements: unmet,
    blockingRequirements: blocking,
  };
}

/**
 * Generate a structured gap report from an evaluation result
 */
export function generateMobilityGapReport(
  teacherId: string,
  result: MobilityEvaluationResult,
): MobilityGapReport {
  const report: MobilityGapReport = {
    teacherId,
    targetId: result.targetId,
    targetName: result.targetName,
    missingCredentials: [],
    missingPathways: [],
    missingEvidence: [],
    insufficientExperience: [],
    insufficientReputation: [],
    recommendedActions: [],
  };

  for (const gap of result.unmetRequirements) {
    const r = gap.requirement;
    switch (r.requirementType) {
      case "credential":
        report.missingCredentials.push(r.requirementLabel);
        report.recommendedActions.push(`Pursue credential: ${r.requirementLabel}`);
        break;
      case "pathway_completion":
        report.missingPathways.push(r.requirementLabel);
        report.recommendedActions.push(`Complete pathway: ${r.requirementLabel}`);
        break;
      case "verified_evidence":
        report.missingEvidence.push(r.requirementLabel);
        report.recommendedActions.push(`Submit verified evidence: ${r.requirementLabel}`);
        break;
      case "experience_years":
        report.insufficientExperience.push(gap.explanation);
        break;
      case "reputation_threshold":
        report.insufficientReputation.push(gap.explanation);
        report.recommendedActions.push(`Build reputation: ${r.requirementLabel}`);
        break;
      default:
        report.recommendedActions.push(`Address: ${r.requirementLabel}`);
    }
  }

  return report;
}
