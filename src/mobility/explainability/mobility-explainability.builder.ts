/**
 * Mobility Explainability Builder — Sprint 5
 *
 * Structures existing evaluation data into interpretable explainability objects.
 */

import type { MobilityEvaluationResult } from "../types/mobility.types";
import type {
  MobilityTargetExplainability,
  MobilityExplainabilityBundle,
} from "./mobility-explainability.types";

function classifyReadiness(percent: number): MobilityTargetExplainability["readinessClassification"] {
  if (percent >= 75) return "ready";
  if (percent >= 50) return "emerging";
  if (percent >= 25) return "developing";
  return "early";
}

function buildTargetSummary(result: MobilityEvaluationResult): string {
  const { readinessPercent, satisfiedCount, totalCount, blockingRequirements, targetName } = result;

  if (totalCount === 0) {
    return `No requirements defined for ${targetName}.`;
  }

  const classification = classifyReadiness(readinessPercent);
  const blockerCount = blockingRequirements.length;

  if (classification === "ready" && blockerCount === 0) {
    return `Ready for ${targetName}: ${satisfiedCount}/${totalCount} requirements met (${readinessPercent}%).`;
  }

  if (classification === "ready" && blockerCount > 0) {
    return `Near-ready for ${targetName} at ${readinessPercent}%, but ${blockerCount} mandatory requirement(s) still blocking.`;
  }

  if (blockerCount > 0) {
    return `${readinessPercent}% readiness for ${targetName} — ${blockerCount} mandatory gap(s) must be addressed first.`;
  }

  return `${readinessPercent}% readiness for ${targetName}: ${satisfiedCount} of ${totalCount} requirements satisfied.`;
}

const CATEGORY_MAP: Record<string, string> = {
  credential: "Credentials",
  career_stage: "Career Stage",
  reputation_threshold: "Reputation",
  verified_evidence: "Verified Evidence",
  curriculum_experience: "Curriculum",
  pathway_completion: "Pathways",
  language: "Language",
  experience_years: "Experience",
  training_completion: "Training",
};

export function buildTargetExplainability(
  result: MobilityEvaluationResult,
): MobilityTargetExplainability {
  const keyDrivers = result.satisfiedRequirements
    .slice(0, 5)
    .map((e) => e.explanation);

  const blockers = result.blockingRequirements.map((e) => e.explanation);

  const signals = [
    ...result.satisfiedRequirements.map((e) => ({
      category: CATEGORY_MAP[e.requirement.requirementType] ?? e.requirement.requirementType,
      status: "satisfied" as const,
      explanation: e.explanation,
    })),
    ...result.unmetRequirements.map((e) => ({
      category: CATEGORY_MAP[e.requirement.requirementType] ?? e.requirement.requirementType,
      status: (e.requirement.isMandatory ? "blocking" : "unmet") as "blocking" | "unmet",
      explanation: e.explanation,
    })),
  ];

  return {
    targetId: result.targetId,
    targetName: result.targetName,
    trackName: result.trackName,
    summary: buildTargetSummary(result),
    keyDrivers,
    blockers,
    signals,
    readinessClassification: classifyReadiness(result.readinessPercent),
  };
}

export function buildMobilityExplainabilityBundle(
  teacherId: string,
  results: MobilityEvaluationResult[],
): MobilityExplainabilityBundle {
  const targets = results.map(buildTargetExplainability);

  const readyCount = targets.filter((t) => t.readinessClassification === "ready").length;
  const emergingCount = targets.filter((t) => t.readinessClassification === "emerging").length;
  const totalTargets = targets.length;

  let overallSummary: string;
  if (totalTargets === 0) {
    overallSummary = "No mobility targets evaluated.";
  } else if (readyCount === totalTargets) {
    overallSummary = `Fully ready across all ${totalTargets} mobility target(s).`;
  } else if (readyCount > 0) {
    overallSummary = `Ready for ${readyCount} of ${totalTargets} target(s), ${emergingCount} emerging.`;
  } else if (emergingCount > 0) {
    overallSummary = `${emergingCount} emerging target(s) out of ${totalTargets} evaluated.`;
  } else {
    overallSummary = `Early stage across ${totalTargets} mobility target(s) — focused development needed.`;
  }

  return {
    teacherId,
    evaluatedAt: new Date().toISOString(),
    targets,
    overallSummary,
  };
}
