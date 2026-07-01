/**
 * Growth Recommendation Engine — Sprint 7C
 *
 * Converts growth intervention targets into actionable recommendations
 * that are runtime-aware. Prevents bad recommendations by checking
 * the teacher's current state.
 *
 * Pure function. Deterministic. Explainable.
 */

import type {
  GrowthInterventionTarget,
  GrowthRecommendation,
  GrowthRecommendationTrace,
  GrowthActionType,
  GrowthEngineTeacherState,
} from "./types/growth-recommendation.types";

// ── Priority Weights ───────────────────────────────────────────

const URGENCY_SCORES: Record<string, number> = {
  critical: 90,
  high: 70,
  medium: 50,
  low: 30,
};

const SOURCE_BOOST: Record<string, number> = {
  rejection_feedback: 20,
  gap_analysis: 10,
  training_completion: 5,
};

// ── Engine ─────────────────────────────────────────────────────

export interface GrowthEngineInput {
  teacherId: string;
  interventionTargets: GrowthInterventionTarget[];
  teacherState: GrowthEngineTeacherState;
  /** Training catalog items mapped by taxonomy term ID */
  catalogByTermId: Record<string, { itemId: string; itemType: string; title: string }[]>;
}

export interface GrowthEngineResult {
  recommendations: GrowthRecommendation[];
  skippedTargets: { target: GrowthInterventionTarget; reason: string }[];
  generatedAt: string;
}

export function runGrowthRecommendationEngine(
  input: GrowthEngineInput,
): GrowthEngineResult {
  const { teacherId, interventionTargets, teacherState, catalogByTermId } = input;
  const recommendations: GrowthRecommendation[] = [];
  const skipped: { target: GrowthInterventionTarget; reason: string }[] = [];

  for (const target of interventionTargets) {
    const result = resolveRecommendation(target, teacherState, catalogByTermId, teacherId);

    if (result.skip) {
      skipped.push({ target, reason: result.skipReason! });
      continue;
    }

    recommendations.push(result.recommendation!);
  }

  // Deduplicate by (actionType + recommendedItemId)
  const deduped = deduplicateRecommendations(recommendations);

  // Sort by priority score descending
  deduped.sort((a, b) => b.priorityScore - a.priorityScore);

  // Limit to top 10
  const final = deduped.slice(0, 10);

  return {
    recommendations: final,
    skippedTargets: skipped,
    generatedAt: new Date().toISOString(),
  };
}

// ── Resolution Logic ───────────────────────────────────────────

interface ResolveResult {
  skip: boolean;
  skipReason?: string;
  recommendation?: GrowthRecommendation;
}

function resolveRecommendation(
  target: GrowthInterventionTarget,
  state: GrowthEngineTeacherState,
  catalog: Record<string, { itemId: string; itemType: string; title: string }[]>,
  teacherId: string,
): ResolveResult {
  const trace: GrowthRecommendationTrace = {
    sourceRejectionReason: target.recommendationContext,
    sourceGapTerms: target.sourceTermIds,
    mappedFrom: `${target.sourceType}→${target.targetGapType}`,
  };

  // Determine the resolved action based on runtime state
  const resolved = resolveActionFromState(target, state, catalog, trace);

  if (resolved.skip) {
    return { skip: true, skipReason: resolved.skipReason };
  }

  const priorityScore =
    (URGENCY_SCORES[target.urgencyLevel] ?? 50) +
    (SOURCE_BOOST[target.sourceType] ?? 0);

  return {
    skip: false,
    recommendation: {
      teacherId,
      sourceType: target.sourceType,
      sourceTermIds: target.sourceTermIds,
      sourceReferenceId: target.sourceReferenceId,
      recommendedItemId: resolved.itemId,
      recommendedItemType: resolved.itemType,
      recommendedActionType: resolved.actionType,
      recommendationReason: buildReasonText(target, resolved, trace),
      recommendationTrace: trace,
      priorityScore,
      status: "active",
    },
  };
}

interface ResolvedAction {
  skip: boolean;
  skipReason?: string;
  actionType: GrowthActionType;
  itemId?: string;
  itemType?: string;
  stateContext?: string;
}

function resolveActionFromState(
  target: GrowthInterventionTarget,
  state: GrowthEngineTeacherState,
  catalog: Record<string, { itemId: string; itemType: string; title: string }[]>,
  trace: GrowthRecommendationTrace,
): ResolvedAction {
  const termIds = [
    ...target.targetCompetencyTermIds,
    ...target.targetCredentialTermIds,
    ...target.targetCurriculumTermIds,
  ];

  // Find matching catalog items
  const matchingItems = termIds.flatMap((tid) => catalog[tid] ?? []);

  switch (target.targetActionType) {
    case "pursue_credential": {
      // Check if credential already earned for any relevant source
      const alreadyEarned = termIds.some((tid) =>
        state.earnedCredentialSourceIds.includes(tid),
      );
      if (alreadyEarned) {
        return { skip: true, skipReason: "Credential already earned for this requirement", actionType: "pursue_credential" };
      }
      // Find credential-eligible catalog item
      const credItem = matchingItems.find((i) => i.itemType === "pathway" || i.itemType === "course");
      trace.currentRuntimeState = "no_credential_earned";
      trace.suggestedOutcome = "Earn required credential";
      return {
        skip: false,
        actionType: "pursue_credential",
        itemId: credItem?.itemId,
        itemType: credItem?.itemType,
      };
    }

    case "start_pathway": {
      // Check if an active pathway already covers this
      const activeMatch = state.activePathwayIds.find((pid) =>
        matchingItems.some((i) => i.itemId === pid),
      );
      if (activeMatch) {
        // Switch to continue_pathway
        const progress = state.activePathwayProgress.find((p) => p.pathwayId === activeMatch);
        trace.currentRuntimeState = `active_pathway_${progress?.progressPercent ?? 0}%`;
        trace.suggestedOutcome = "Continue existing pathway";
        return {
          skip: false,
          actionType: "continue_pathway",
          itemId: activeMatch,
          itemType: "pathway",
          stateContext: `Already enrolled — ${progress?.progressPercent ?? 0}% complete`,
        };
      }
      // Check if already completed
      const completedMatch = matchingItems.find((i) =>
        state.completedItemIds.includes(i.itemId),
      );
      if (completedMatch) {
        // Check if verified
        if (state.verifiedCompletionItemIds.includes(completedMatch.itemId)) {
          return { skip: true, skipReason: "Pathway already completed and verified", actionType: "start_pathway" };
        }
        // Not verified — recommend submit evidence
        trace.currentRuntimeState = "completed_not_verified";
        trace.suggestedOutcome = "Submit evidence to verify completion";
        return {
          skip: false,
          actionType: "submit_evidence",
          itemId: completedMatch.itemId,
          itemType: completedMatch.itemType,
        };
      }
      // Fresh start
      const pathwayItem = matchingItems.find((i) => i.itemType === "pathway") ?? matchingItems[0];
      trace.currentRuntimeState = "no_enrollment";
      trace.suggestedOutcome = "Start professional development pathway";
      return {
        skip: false,
        actionType: "start_pathway",
        itemId: pathwayItem?.itemId,
        itemType: pathwayItem?.itemType ?? "pathway",
      };
    }

    case "continue_pathway": {
      const activeMatch = state.activePathwayIds.find((pid) =>
        matchingItems.some((i) => i.itemId === pid),
      );
      if (!activeMatch) {
        // No active pathway — fallback to start
        const item = matchingItems.find((i) => i.itemType === "pathway") ?? matchingItems[0];
        if (!item) {
          return { skip: true, skipReason: "No matching pathway in catalog", actionType: "continue_pathway" };
        }
        trace.currentRuntimeState = "no_active_pathway";
        return { skip: false, actionType: "start_pathway", itemId: item.itemId, itemType: item.itemType };
      }
      trace.currentRuntimeState = "active_pathway";
      return { skip: false, actionType: "continue_pathway", itemId: activeMatch, itemType: "pathway" };
    }

    case "submit_evidence": {
      // Check if there's pending evidence that needs revision
      if (state.rejectedEvidenceIds.length > 0) {
        trace.currentRuntimeState = "evidence_rejected";
        trace.suggestedOutcome = "Revise rejected evidence submission";
        return { skip: false, actionType: "revise_evidence", itemId: state.rejectedEvidenceIds[0] };
      }
      // Check if evidence is pending mentor review
      if (state.pendingMentorReviewIds.length > 0) {
        return { skip: true, skipReason: "Evidence already pending mentor review", actionType: "submit_evidence" };
      }
      trace.currentRuntimeState = "no_evidence_submitted";
      trace.suggestedOutcome = "Submit teaching practice evidence";
      return { skip: false, actionType: "submit_evidence" };
    }

    case "enroll_course": {
      // Check if already enrolled in matching course
      const alreadyEnrolled = matchingItems.find((i) =>
        state.activeEnrollmentItemIds.includes(i.itemId),
      );
      if (alreadyEnrolled) {
        return { skip: true, skipReason: "Already enrolled in matching course", actionType: "enroll_course" };
      }
      const alreadyCompleted = matchingItems.find((i) =>
        state.completedItemIds.includes(i.itemId),
      );
      if (alreadyCompleted) {
        return { skip: true, skipReason: "Matching course already completed", actionType: "enroll_course" };
      }
      const courseItem = matchingItems.find((i) => i.itemType === "course") ?? matchingItems[0];
      if (!courseItem) {
        trace.currentRuntimeState = "no_catalog_match";
        // Still recommend generic action
        return { skip: false, actionType: "enroll_course" };
      }
      trace.currentRuntimeState = "no_enrollment";
      trace.suggestedOutcome = "Enroll in targeted training course";
      return { skip: false, actionType: "enroll_course", itemId: courseItem.itemId, itemType: courseItem.itemType };
    }

    case "request_mentor_validation": {
      if (state.pendingMentorReviewIds.length > 0) {
        return { skip: true, skipReason: "Mentor validation already pending", actionType: "request_mentor_validation" };
      }
      if (state.pendingEvidenceExecutionIds.length === 0) {
        return { skip: true, skipReason: "No evidence available for mentor review", actionType: "request_mentor_validation" };
      }
      trace.currentRuntimeState = "evidence_ready_for_review";
      return { skip: false, actionType: "request_mentor_validation" };
    }

    default: {
      const item = matchingItems[0];
      return {
        skip: false,
        actionType: target.targetActionType,
        itemId: item?.itemId,
        itemType: item?.itemType,
      };
    }
  }
}

// ── Reason Text Builder ────────────────────────────────────────

function buildReasonText(
  target: GrowthInterventionTarget,
  resolved: ResolvedAction,
  trace: GrowthRecommendationTrace,
): string {
  const parts: string[] = [];

  // Source context
  parts.push(target.recommendationContext);

  // Runtime state context
  if (resolved.stateContext) {
    parts.push(resolved.stateContext);
  }

  // Suggested outcome
  if (trace.suggestedOutcome) {
    parts.push(`Suggested: ${trace.suggestedOutcome}`);
  }

  return parts.join(". ") + ".";
}

// ── Deduplication ──────────────────────────────────────────────

function deduplicateRecommendations(
  recs: GrowthRecommendation[],
): GrowthRecommendation[] {
  const seen = new Map<string, GrowthRecommendation>();

  for (const rec of recs) {
    const key = `${rec.recommendedActionType}::${rec.recommendedItemId ?? rec.sourceTermIds.join(",")}`;
    const existing = seen.get(key);
    if (!existing || rec.priorityScore > existing.priorityScore) {
      seen.set(key, rec);
    }
  }

  return Array.from(seen.values());
}
