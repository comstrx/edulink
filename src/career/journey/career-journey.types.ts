/**
 * Career Journey Types
 *
 * Defines the career journey plan produced by the journey builder.
 *
 * Step 10D — Career Operating System Layer
 */

import type { CareerGoalType } from "../goals/career-goal.types";

export type JourneyStage = "not_started" | "beginning" | "progressing" | "advanced" | "achieved";

export interface CareerMilestone {
  milestoneId: string;
  label: string;
  category: "gap_closure" | "training" | "verification" | "experience" | "profile";
  completed: boolean;
  /** Related taxonomy term ID if applicable */
  relatedTermId?: string;
}

export interface JourneyNextAction {
  actionId: string;
  label: string;
  actionType: "training" | "profile" | "verification" | "career";
  priority: "critical" | "high" | "medium" | "low";
  targetResourceId?: string;
  reasonCodes: string[];
}

export interface JourneyRiskArea {
  label: string;
  severity: "low" | "medium" | "high";
  category: string;
}

export interface CareerJourneyPlan {
  goalType: CareerGoalType;
  currentStage: JourneyStage;
  progressPercent: number;
  nextActions: JourneyNextAction[];
  milestones: CareerMilestone[];
  riskAreas: JourneyRiskArea[];
  /** Debug metadata */
  _debug?: {
    inputSignals: string[];
    computedAt: string;
  };
}

/** Empty journey plan for fail-safe scenarios */
export function emptyJourneyPlan(goalType: CareerGoalType): CareerJourneyPlan {
  return {
    goalType,
    currentStage: "not_started",
    progressPercent: 0,
    nextActions: [],
    milestones: [],
    riskAreas: [],
  };
}
