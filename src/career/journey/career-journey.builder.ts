/**
 * Career Journey Builder
 *
 * Assembles a CareerJourneyPlan from intelligence adapter signals.
 * Pure function — reads signals, never recomputes intelligence.
 *
 * Step 10D — Career Operating System Layer
 */

import type {
  CareerReadinessSignal,
  GapInsightSignal,
  ActionableRecommendations,
  VerificationSignal,
} from "@/intelligence/adapters/types/adapter-signals.types";
import type { CareerGoalType } from "../goals/career-goal.types";
import { CAREER_GOAL_DEFINITIONS } from "../goals/career-goal.types";
import type {
  CareerJourneyPlan,
  JourneyStage,
  CareerMilestone,
  JourneyNextAction,
  JourneyRiskArea,
} from "./career-journey.types";
import { emptyJourneyPlan } from "./career-journey.types";

// ── Inputs ─────────────────────────────────────────────────────

export interface JourneyBuilderInputs {
  readiness: CareerReadinessSignal | null;
  gaps: GapInsightSignal | null;
  recommendations: ActionableRecommendations | null;
  verification: VerificationSignal | null;
}

// ── Stage resolution ───────────────────────────────────────────

function resolveStage(progressPercent: number): JourneyStage {
  if (progressPercent >= 95) return "achieved";
  if (progressPercent >= 70) return "advanced";
  if (progressPercent >= 40) return "progressing";
  if (progressPercent > 0) return "beginning";
  return "not_started";
}

// ── Progress calculation ───────────────────────────────────────

function calculateProgress(inputs: JourneyBuilderInputs, goalType: CareerGoalType): number {
  const definition = CAREER_GOAL_DEFINITIONS[goalType];
  if (!definition) return 0;

  let totalWeight = 0;
  let earnedWeight = 0;

  // Readiness contributes based on score
  if (inputs.readiness) {
    totalWeight += 40;
    earnedWeight += (inputs.readiness.score / 100) * 40;
  } else {
    totalWeight += 40;
  }

  // Verification progress
  if (inputs.verification) {
    totalWeight += 25;
    const verRatio = inputs.verification.totalCount > 0
      ? inputs.verification.verifiedCount / inputs.verification.totalCount
      : 0;
    earnedWeight += verRatio * 25;
  } else {
    totalWeight += 25;
  }

  // Gap closure (fewer gaps = more progress)
  if (inputs.gaps) {
    totalWeight += 20;
    const gapPenalty = Math.min(inputs.gaps.totalGaps * 4, 20);
    earnedWeight += 20 - gapPenalty;
  } else {
    totalWeight += 20;
  }

  // Recommendations completion (fewer priority actions = more progress)
  if (inputs.recommendations) {
    totalWeight += 15;
    const pendingCritical = inputs.recommendations.priorityActions.length;
    const actionPenalty = Math.min(pendingCritical * 3, 15);
    earnedWeight += 15 - actionPenalty;
  } else {
    totalWeight += 15;
  }

  if (totalWeight === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100)));
}

// ── Milestones ─────────────────────────────────────────────────

function buildMilestones(inputs: JourneyBuilderInputs): CareerMilestone[] {
  const milestones: CareerMilestone[] = [];
  let idx = 0;

  // Readiness milestone
  if (inputs.readiness) {
    milestones.push({
      milestoneId: `ms-${idx++}`,
      label: `Reach ${inputs.readiness.readinessLevel === "highly_ready" ? "peak" : "career-ready"} readiness`,
      category: "profile",
      completed: inputs.readiness.readinessLevel === "ready" || inputs.readiness.readinessLevel === "highly_ready",
    });
  }

  // Verification milestone
  if (inputs.verification) {
    milestones.push({
      milestoneId: `ms-${idx++}`,
      label: "Complete credential verification",
      category: "verification",
      completed: inputs.verification.verificationLevel === "verified",
    });

    inputs.verification.missingVerifications.slice(0, 3).forEach((mv) => {
      milestones.push({
        milestoneId: `ms-${idx++}`,
        label: `Verify ${mv.credentialType}`,
        category: "verification",
        completed: false,
        relatedTermId: mv.termId,
      });
    });
  }

  // Gap closure milestones
  if (inputs.gaps) {
    const highGaps = inputs.gaps.topGaps.filter((g) => g.severity === "high");
    highGaps.slice(0, 3).forEach((g) => {
      milestones.push({
        milestoneId: `ms-${idx++}`,
        label: `Close gap: ${g.label}`,
        category: "gap_closure",
        completed: false,
        relatedTermId: g.termId,
      });
    });
  }

  // Training milestones from recommendations
  if (inputs.recommendations) {
    inputs.recommendations.trainingActions.slice(0, 2).forEach((ta) => {
      milestones.push({
        milestoneId: `ms-${idx++}`,
        label: "Complete recommended training",
        category: "training",
        completed: false,
      });
    });
  }

  return milestones;
}

// ── Next Actions ───────────────────────────────────────────────

function buildNextActions(inputs: JourneyBuilderInputs): JourneyNextAction[] {
  const actions: JourneyNextAction[] = [];
  let idx = 0;

  // Pull from priority recommendations
  if (inputs.recommendations) {
    inputs.recommendations.priorityActions.slice(0, 3).forEach((pa) => {
      actions.push({
        actionId: `act-${idx++}`,
        label: `${pa.actionType} action`,
        actionType: pa.actionType,
        priority: pa.priority,
        targetResourceId: pa.targetResourceId,
        reasonCodes: pa.reasonCodes,
      });
    });

    // Add top training action if not already included
    if (actions.length < 5) {
      inputs.recommendations.trainingActions.slice(0, 2).forEach((ta) => {
        if (!actions.some((a) => a.targetResourceId === ta.targetResourceId)) {
          actions.push({
            actionId: `act-${idx++}`,
            label: "Complete training",
            actionType: "training",
            priority: ta.priority,
            targetResourceId: ta.targetResourceId,
            reasonCodes: ta.reasonCodes,
          });
        }
      });
    }
  }

  // Verification actions
  if (inputs.verification && inputs.verification.missingVerifications.length > 0) {
    actions.push({
      actionId: `act-${idx++}`,
      label: "Verify credentials",
      actionType: "verification",
      priority: "high",
      reasonCodes: ["missing_verification"],
    });
  }

  // Profile improvement if gaps exist
  if (inputs.gaps && inputs.gaps.totalGaps > 3) {
    actions.push({
      actionId: `act-${idx++}`,
      label: "Address profile gaps",
      actionType: "profile",
      priority: "medium",
      reasonCodes: ["multiple_gaps"],
    });
  }

  return actions;
}

// ── Risk Areas ─────────────────────────────────────────────────

function buildRiskAreas(inputs: JourneyBuilderInputs): JourneyRiskArea[] {
  const risks: JourneyRiskArea[] = [];

  if (inputs.readiness && inputs.readiness.topRisks.length > 0) {
    inputs.readiness.topRisks.forEach((r) => {
      risks.push({ label: r, severity: "medium", category: "readiness" });
    });
  }

  if (inputs.gaps) {
    const highGaps = inputs.gaps.topGaps.filter((g) => g.severity === "high");
    highGaps.forEach((g) => {
      risks.push({ label: g.label, severity: "high", category: g.category });
    });
  }

  if (inputs.verification && inputs.verification.verificationLevel === "unverified") {
    risks.push({ label: "No verified credentials", severity: "high", category: "verification" });
  }

  return risks;
}

// ── Main Builder ───────────────────────────────────────────────

/**
 * Builds a career journey plan from intelligence adapter signals.
 * Pure function — no DB calls, no engine recomputation.
 */
export function buildCareerJourney(
  goalType: CareerGoalType,
  inputs: JourneyBuilderInputs,
): CareerJourneyPlan {
  // Fail-safe: if all signals are missing, return empty plan
  if (!inputs.readiness && !inputs.gaps && !inputs.recommendations && !inputs.verification) {
    return emptyJourneyPlan(goalType);
  }

  const progressPercent = calculateProgress(inputs, goalType);
  const inputSignals: string[] = [];
  if (inputs.readiness) inputSignals.push("readiness");
  if (inputs.gaps) inputSignals.push("gaps");
  if (inputs.recommendations) inputSignals.push("recommendations");
  if (inputs.verification) inputSignals.push("verification");

  return {
    goalType,
    currentStage: resolveStage(progressPercent),
    progressPercent,
    nextActions: buildNextActions(inputs),
    milestones: buildMilestones(inputs),
    riskAreas: buildRiskAreas(inputs),
    _debug: {
      inputSignals,
      computedAt: new Date().toISOString(),
    },
  };
}
