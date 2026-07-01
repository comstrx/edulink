/**
 * Mobility Feedback Service — Sprint 5, Step 4
 *
 * Analyzes mobility evaluation results and triggers downstream actions
 * through existing growth recommendation system.
 *
 * Feedback loops:
 *   - Blocking gaps → growth recommendations (pursue_credential, enroll_course, etc.)
 *   - Low readiness → training suggestions
 *   - Near-ready targets → targeted growth actions
 *   - Ready targets → advancement signals
 *
 * Does NOT re-enter Smart Glue. Calls downstream directly.
 */

import { supabase } from "@/integrations/supabase/client";
import { insertSingleGrowthRecommendation, type CrossDomainGrowthInput } from "@/intelligence/growth/growth-recommendation-writer";
import type { MobilityEvaluationResult } from "../types/mobility.types";
import type { MobilityExplainabilityBundle } from "../explainability/mobility-explainability.types";
import { logExecution } from "@/smart-glue/execution-telemetry";

export interface MobilityFeedbackAction {
  actionType: "growth_refresh" | "training_recommendation" | "advancement_signal";
  teacherId: string;
  targetId: string;
  targetName: string;
  reason: string;
  recommendedActionType: CrossDomainGrowthInput["recommendedActionType"];
  priorityScore: number;
}

export interface MobilityFeedbackResult {
  teacherId: string;
  actionsAnalyzed: number;
  actionsInserted: number;
  skippedCount: number;
}

/**
 * Map requirement types to canonical growth action types.
 */
const REQ_TYPE_TO_ACTION: Record<string, CrossDomainGrowthInput["recommendedActionType"]> = {
  credential: "pursue_credential",
  pathway_completion: "start_pathway",
  training_completion: "enroll_course",
  verified_evidence: "submit_evidence",
  reputation_threshold: "request_mentor_validation",
  experience_years: "enroll_course",
  curriculum_experience: "enroll_course",
  language: "enroll_course",
  career_stage: "continue_pathway",
};

const DEFAULT_ACTION: CrossDomainGrowthInput["recommendedActionType"] = "enroll_course";
function resolveAction(reqType: string): CrossDomainGrowthInput["recommendedActionType"] {
  return REQ_TYPE_TO_ACTION[reqType] ?? DEFAULT_ACTION;
}

/**
 * Analyze mobility results and produce feedback actions.
 */
export function analyzeMobilityFeedback(
  teacherId: string,
  results: MobilityEvaluationResult[],
): MobilityFeedbackAction[] {
  const actions: MobilityFeedbackAction[] = [];
  const seenKeys = new Set<string>();

  for (const result of results) {
    const { targetId, targetName, readinessPercent, blockingRequirements, unmetRequirements } = result;

    // 1. Blocking gaps → high-priority growth recommendations
    for (const blocker of blockingRequirements.slice(0, 3)) {
      const key = `${teacherId}:${targetId}:${blocker.requirement.requirementKey}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      actions.push({
        actionType: "growth_refresh",
        teacherId,
        targetId,
        targetName,
        reason: `Mobility blocker for ${targetName}: ${blocker.explanation}`,
        recommendedActionType: resolveAction(blocker.requirement.requirementType),
        priorityScore: 85,
      });
    }

    // 2. Low readiness (<40%) non-blocking unmet → training suggestions
    if (readinessPercent < 40) {
      const nonBlocking = unmetRequirements.filter((u) => !u.requirement.isMandatory);
      for (const gap of nonBlocking.slice(0, 2)) {
        const key = `${teacherId}:${targetId}:${gap.requirement.requirementKey}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        actions.push({
          actionType: "training_recommendation",
          teacherId,
          targetId,
          targetName,
          reason: `Low readiness (${readinessPercent}%) for ${targetName}: ${gap.explanation}`,
          recommendedActionType: resolveAction(gap.requirement.requirementType),
          priorityScore: 50,
        });
      }
    }

    // 3. Near-ready (60-74%) → targeted actions for remaining gaps
    if (readinessPercent >= 60 && readinessPercent < 75) {
      for (const gap of unmetRequirements.slice(0, 2)) {
        const key = `${teacherId}:${targetId}:${gap.requirement.requirementKey}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        actions.push({
          actionType: "growth_refresh",
          teacherId,
          targetId,
          targetName,
          reason: `Near-ready (${readinessPercent}%) for ${targetName}: ${gap.explanation}`,
          recommendedActionType: resolveAction(gap.requirement.requirementType),
          priorityScore: 70,
        });
      }
    }

    // 4. Ready (≥75%) with no blockers → advancement signal
    if (readinessPercent >= 75 && blockingRequirements.length === 0) {
      const key = `${teacherId}:${targetId}:advancement`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        actions.push({
          actionType: "advancement_signal",
          teacherId,
          targetId,
          targetName,
          reason: `Ready for ${targetName} (${readinessPercent}%) — eligible for transition`,
          recommendedActionType: "continue_pathway",
          priorityScore: 60,
        });
      }
    }
  }

  return actions;
}

/**
 * Execute mobility feedback actions by persisting growth recommendations.
 * Deduplicates against existing active recommendations.
 */
export async function executeMobilityFeedback(
  teacherId: string,
  actions: MobilityFeedbackAction[],
  traceId?: string,
): Promise<MobilityFeedbackResult> {
  const insertableActions = actions.filter((a) => a.actionType !== "advancement_signal");

  if (insertableActions.length === 0) {
    return { teacherId, actionsAnalyzed: actions.length, actionsInserted: 0, skippedCount: 0 };
  }

  let insertedCount = 0;
  for (const action of insertableActions) {
    // Dedup: skip if active recommendation from mobility already exists for this teacher+target
    const { data: existing } = await supabase
      .from("growth_recommendations")
      .select("id")
      .eq("teacher_id", action.teacherId)
      .eq("source_type", "mobility_evaluation")
      .eq("source_reference_id", action.targetId)
      .eq("status", "active")
      .maybeSingle();

    if (!existing) {
      // Mobility-attributed recommendation via canonical writer
      const result = await insertSingleGrowthRecommendation({
        teacherId: action.teacherId,
        sourceType: "mobility_evaluation",
        sourceReferenceId: action.targetId,
        sourceTermIds: [],
        recommendedActionType: action.recommendedActionType,
        recommendationReason: action.reason,
        recommendationTrace: {
          mappedFrom: "mobility_feedback",
          suggestedOutcome: action.targetName,
          blockingCondition: action.actionType,
        },
        priorityScore: action.priorityScore,
      }, traceId);
      if (result.success) insertedCount++;
    }
  }

  if (traceId) {
    logExecution({
      traceId,
      stage: "mobility_feedback_executed",
      meta: {
        teacherId,
        totalActions: actions.length,
        insertable: insertableActions.length,
        inserted: insertedCount,
        skipped: insertableActions.length - insertedCount,
        advancementSignals: actions.filter((a) => a.actionType === "advancement_signal").length,
      },
    });
  }

  return {
    teacherId,
    actionsAnalyzed: actions.length,
    actionsInserted: insertedCount,
    skippedCount: insertableActions.length - insertedCount,
  };
}
