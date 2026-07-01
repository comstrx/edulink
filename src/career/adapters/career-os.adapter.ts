/**
 * Career OS Adapter
 *
 * Composes journey, progress, and opportunity radar into a single
 * CareerExperienceSignal. Pure orchestration — no recomputation.
 *
 * Step 10D — Career Operating System Layer
 */

import type {
  CareerReadinessSignal,
  GapInsightSignal,
  ActionableRecommendations,
  VerificationSignal,
  JobCompatibilitySignal,
} from "@/intelligence/adapters/types/adapter-signals.types";
import type { CareerGoalType } from "../goals/career-goal.types";
import type { CareerJourneyPlan } from "../journey/career-journey.types";
import { buildCareerJourney } from "../journey/career-journey.builder";
import type { CareerProgress } from "../progress/career-progress.service";
import { calculateCareerProgress } from "../progress/career-progress.service";
import type { OpportunityRadarSignal } from "../radar/opportunity-radar.service";
import { buildOpportunityRadar } from "../radar/opportunity-radar.service";

// ── Types ──────────────────────────────────────────────────────

export interface CareerExperienceSignal {
  goal: CareerGoalType | null;
  journey: CareerJourneyPlan | null;
  progress: CareerProgress;
  opportunities: OpportunityRadarSignal;
  careerInsights: CareerInsight[];
  /** Debug metadata for observability */
  _debug?: {
    signalsUsed: string[];
    computedAt: string;
  };
}

export interface CareerInsight {
  insightId: string;
  type: "strength" | "risk" | "opportunity" | "action";
  label: string;
  priority: "high" | "medium" | "low";
}

export interface CareerExperienceInputs {
  readiness: CareerReadinessSignal | null;
  gaps: GapInsightSignal | null;
  recommendations: ActionableRecommendations | null;
  verification: VerificationSignal | null;
  matchSignals: JobCompatibilitySignal[];
  goalType: CareerGoalType | null;
}

// ── Insight extraction ─────────────────────────────────────────

function extractInsights(inputs: CareerExperienceInputs): CareerInsight[] {
  const insights: CareerInsight[] = [];
  let idx = 0;

  if (inputs.readiness) {
    inputs.readiness.topStrengths.slice(0, 2).forEach((s) => {
      insights.push({ insightId: `ins-${idx++}`, type: "strength", label: s, priority: "medium" });
    });
    inputs.readiness.topRisks.slice(0, 2).forEach((r) => {
      insights.push({ insightId: `ins-${idx++}`, type: "risk", label: r, priority: "high" });
    });
  }

  if (inputs.gaps && inputs.gaps.totalGaps > 0) {
    const highGapCount = inputs.gaps.topGaps.filter((g) => g.severity === "high").length;
    if (highGapCount > 0) {
      insights.push({
        insightId: `ins-${idx++}`,
        type: "risk",
        label: `${highGapCount} critical gap${highGapCount > 1 ? "s" : ""} need attention`,
        priority: "high",
      });
    }
  }

  if (inputs.verification) {
    if (inputs.verification.verificationLevel === "verified") {
      insights.push({
        insightId: `ins-${idx++}`,
        type: "strength",
        label: "All credentials verified",
        priority: "medium",
      });
    } else if (inputs.verification.missingVerifications.length > 0) {
      insights.push({
        insightId: `ins-${idx++}`,
        type: "action",
        label: `${inputs.verification.missingVerifications.length} credential${inputs.verification.missingVerifications.length > 1 ? "s" : ""} pending verification`,
        priority: "high",
      });
    }
  }

  if (inputs.recommendations && inputs.recommendations.priorityActions.length > 0) {
    insights.push({
      insightId: `ins-${idx++}`,
      type: "action",
      label: `${inputs.recommendations.priorityActions.length} priority action${inputs.recommendations.priorityActions.length > 1 ? "s" : ""} available`,
      priority: "high",
    });
  }

  const eligibleCount = inputs.matchSignals.filter((m) => m.compatibilityScore >= 70).length;
  if (eligibleCount > 0) {
    insights.push({
      insightId: `ins-${idx++}`,
      type: "opportunity",
      label: `Strong match with ${eligibleCount} job${eligibleCount > 1 ? "s" : ""}`,
      priority: "medium",
    });
  }

  return insights;
}

// ── Main function ──────────────────────────────────────────────

/**
 * Builds the complete career experience signal.
 * Orchestrates journey, progress, and opportunity radar.
 * Degrades safely when signals are missing.
 */
export function buildCareerExperience(inputs: CareerExperienceInputs): CareerExperienceSignal {
  const signalsUsed: string[] = [];
  if (inputs.readiness) signalsUsed.push("readiness");
  if (inputs.gaps) signalsUsed.push("gaps");
  if (inputs.recommendations) signalsUsed.push("recommendations");
  if (inputs.verification) signalsUsed.push("verification");
  if (inputs.matchSignals.length > 0) signalsUsed.push("matches");

  // Journey (only if goal is set)
  const journey = inputs.goalType
    ? buildCareerJourney(inputs.goalType, {
        readiness: inputs.readiness,
        gaps: inputs.gaps,
        recommendations: inputs.recommendations,
        verification: inputs.verification,
      })
    : null;

  // Progress (always available, degrades safely)
  const progress = calculateCareerProgress({
    readiness: inputs.readiness,
    verification: inputs.verification,
    gaps: inputs.gaps,
  });

  // Opportunity radar
  const opportunities = buildOpportunityRadar({
    readiness: inputs.readiness,
    matchSignals: inputs.matchSignals,
    verification: inputs.verification,
  });

  // Career insights
  const careerInsights = extractInsights(inputs);

  return {
    goal: inputs.goalType,
    journey,
    progress,
    opportunities,
    careerInsights,
    _debug: {
      signalsUsed,
      computedAt: new Date().toISOString(),
    },
  };
}
