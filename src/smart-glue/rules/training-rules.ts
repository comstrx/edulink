/**
 * Smart Glue Rules — Training Domain
 *
 * Maps training events to intelligence intents.
 * No scoring logic. No direct coupling to Hiring internals.
 *
 * Sprint 11: training.completed uses Decision Engine for gap-aware prioritization.
 * Sprint 12: Cross-domain decision overlay for multi-signal reasoning.
 * Sprint 14: Provider attribution and effectiveness overlay.
 * Sprint 15: Outcome feedback overlay — system learns from results.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule, IntentEmission } from "../types";
import {
  readRecommendationContext,
  type RecommendationGateContext,
} from "../intelligence/recommendation-context.reader";
import {
  readTrainingCompletionContext,
  type TrainingCompletionDecisionContext,
} from "../intelligence/training-completion-context.reader";
import { resolveCrossDomainContext, type CrossDomainContext } from "../intelligence/cross-domain-context.reader";
import { resolveTrainingCompletionDecision, resolveCrossDomainDecision } from "../decision-engine";
import { applyDecisionSafety } from "../decision-safety";
import { resolveProviderAttribution } from "@/intelligence/provider/provider-attribution.service";
import { getProviderPerformanceSummary, invalidateProviderSummary } from "@/intelligence/provider/provider-signals.service";
import { resolveProviderCriOverlay, logProviderDecision } from "@/intelligence/provider/provider-decision-overlay";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import type { ProviderPerformanceSummary } from "@/intelligence/provider/provider-performance.types";
import { resolveTeacherFeedback, detectRecommendationOutcome, detectGapClosureOutcome } from "@/intelligence/outcomes/outcome-signal.service";
import { completeRecommendationsForCourse } from "@/intelligence/growth/growth-loop-completion.service";
import { resolveFeedbackOverlay, logFeedbackDecision } from "@/intelligence/outcomes/feedback-decision-overlay";
import type { TeacherOutcomeFeedback } from "@/intelligence/outcomes/outcome.types";
import type { FeedbackOverlay } from "@/intelligence/outcomes/feedback-decision-overlay";
import { readInteractionSignals } from "@/intelligence/feedback/interaction-signal.reader";

// ── Combined context ──────────────────────────────────────────

interface TrainingCombinedContext {
  local: TrainingCompletionDecisionContext;
  crossDomain: CrossDomainContext;
  provider: ProviderPerformanceSummary | null;
  providerId: string | null;
  feedback: TeacherOutcomeFeedback | null;
  feedbackOverlay: FeedbackOverlay;
}


/** When a course is completed → Decision Engine + Cross-Domain + Provider Overlay (Sprint 14) */
export const onTrainingCompleted: GlueRule<"training.completed"> = {
  id: "training.completed→decision_engine",
  description: "Decision Engine–driven intelligence refresh on training completion (cross-domain + provider aware)",
  trigger: EVENT_NAMES.training.completed,

  resolveContext: async (event) => {
    // Resolve provider attribution from courseId → training_items.provider_id
    const attribution = await resolveProviderAttribution(event.payload.courseId);
    const providerId = attribution.providerId;

    const [local, crossDomain, providerSummary, feedback, recOutcome, interaction] = await Promise.all([
      readTrainingCompletionContext(event.payload.teacherId, event.payload.skillIds),
      resolveCrossDomainContext(event.payload.teacherId),
      providerId ? getProviderPerformanceSummary(providerId) : Promise.resolve(null),
      resolveTeacherFeedback(event.payload.teacherId),
      detectRecommendationOutcome(event.payload.teacherId, event.payload.courseId),
      readInteractionSignals(event.payload.teacherId),
    ]);

    // Invalidate cached provider summary (completion changes counts)
    if (providerId) invalidateProviderSummary(providerId);

    // Detect gap closure outcome (from already-resolved local context)
    const gapOutcome = detectGapClosureOutcome(
      event.payload.teacherId,
      local.closedGaps.length,
      local.totalGaps,
    );

    // Log outcome signals if detected
    if (recOutcome) {
      logDecisionTrace({ traceId: `ctx_train_${Date.now().toString(36)}`, decisionType: "feedback_overlay", metadata: { outcomeType: recOutcome.outcomeType, reasoning: recOutcome.reasoning } });
      // Close the loop: mark the recommendation as completed in growth_recommendations
      completeRecommendationsForCourse(event.payload.teacherId, event.payload.courseId).catch(() => {});
    }
    if (gapOutcome) {
      logDecisionTrace({ traceId: `ctx_train_${Date.now().toString(36)}`, decisionType: "feedback_overlay", metadata: { outcomeType: gapOutcome.outcomeType, reasoning: gapOutcome.reasoning } });
    }

    const feedbackOverlay = resolveFeedbackOverlay(feedback, interaction);

    return { local, crossDomain, provider: providerSummary, providerId, feedback, feedbackOverlay } as TrainingCombinedContext;
  },

  emitIntents: (event, rawContext) => {
    const combined = rawContext as TrainingCombinedContext | undefined;
    const localCtx = combined?.local;
    const crossCtx = combined?.crossDomain;
    const providerSummary = combined?.provider ?? null;
    const providerId = combined?.providerId ?? null;
    const feedback = combined?.feedback ?? null;
    const fbOverlay = combined?.feedbackOverlay ?? resolveFeedbackOverlay(null);

    // TraceId: generated once at rule entry (Sprint 5.2)
    const traceId = `rule_train_${Date.now().toString(36)}`;

    // Step 1: Local decision
    const decision = resolveTrainingCompletionDecision(localCtx, traceId);

    // Step 2: Cross-domain decision
    const crossDecision = resolveCrossDomainDecision(crossCtx, traceId);

    // Step 3: Provider overlay (Sprint 14)
    const providerBand = providerSummary?.effectivenessBand ?? "unknown";
    const providerOverlay = resolveProviderCriOverlay(providerBand);

    // Step 4: Feedback overlay (Sprint 15) — adjust based on outcome history
    if (feedback) {
      logFeedbackDecision(event.payload.teacherId, feedback, fbOverlay, "training.completed");
    }

    // Apply feedback priority override if present
    const effectivePriority = fbOverlay.priorityOverride ?? decision.priority;

    // Log provider decision
    if (providerId) {
      const impact = providerBand === "high" ? "boost" :
                     providerBand === "low" ? "reduce" : "ignore";
      logProviderDecision(traceId, providerId, providerBand, "training.completed", impact, {
        effectivenessScore: providerSummary?.effectivenessScore ?? 0,
        completionCount: providerSummary?.completionCount ?? 0,
        criOverlay: providerOverlay.reasoning,
      });
    }

    const intents: IntentEmission[] = [];
    const priorityMeta = {
      priority: effectivePriority,
      closesGap: decision.closesGap,
      focusGap: decision.closedGaps[0] ?? undefined,
      providerId: providerId ?? undefined,
      providerBand: providerBand !== "unknown" ? providerBand : undefined,
      learnerBand: feedback?.learnerBand,
    };

    // CRI refresh (provider overlay may boost scope)
    if (decision.shouldRefreshCri) {
      intents.push({
        intent: EVENT_NAMES.intents.criRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.training.completed,
          providerBoost: providerOverlay.boostScope,
          feedbackCriModifier: fbOverlay.criPriorityModifier,
          ...priorityMeta,
        },
      });
    }

    // Gap refresh (always — feedback may boost gap-aligned)
    intents.push({
      intent: EVENT_NAMES.intents.skillGapRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.completed,
        boostGapAligned: fbOverlay.boostGapAligned,
        ...priorityMeta,
      },
    });

    // Conditional: recommendations (provider + feedback aware)
    const suppressRecsForLowProvider = providerBand === "low" && !decision.closesGap;
    const suppressRecsForEffectiveLearner = fbOverlay.suppressLowImpact && !decision.closesGap;
    const shouldEmitRecs = decision.shouldGenerateRecommendations
      && !suppressRecsForLowProvider
      && !suppressRecsForEffectiveLearner;

    if (shouldEmitRecs) {
      intents.push({
        intent: EVENT_NAMES.intents.trainingRecommendationRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.training.completed,
          skillIds: event.payload.skillIds,
          recommendationCap: fbOverlay.recommendationCap,
          boostProviderRecommendations: fbOverlay.boostProviderRecommendations,
          ...priorityMeta,
        },
      });
    }

    // Reputation (always)
    intents.push({
      intent: EVENT_NAMES.intents.reputationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.completed,
        eventType: "training_completed",
        ...priorityMeta,
      },
    });

    // Cross-domain: boost matching if scenario indicates
    if (crossDecision.boostMatching) {
      intents.push({
        intent: EVENT_NAMES.intents.matchRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.training.completed,
          crossDomainBoost: true,
        },
      });
    }

    // Step 5+6: Safety pipeline (overlay → dedup → conflicts → budget)
    const safetyResult = applyDecisionSafety({
      intents,
      crossDecision,
      maxIntents: decision.maxIntents,
      eventName: "training.completed",
      entityId: event.payload.teacherId,
        traceId,
    });

    logDecisionTrace({
      traceId,
      decisionType: "training_completion",
      entityId: event.payload.teacherId,
      eventName: "training.completed",
      metadata: {
        closesGap: decision.closesGap,
        closedGapCount: decision.closedGaps.length,
        priority: effectivePriority,
        crossDomainScenario: crossDecision.scenario,
        providerBand: providerBand !== "unknown" ? providerBand : null,
        intentsRequested: intents.length,
        intentsEmitted: safetyResult.intents.length,
      },
    });

    return safetyResult.intents;
  },
};

/** When a pathway is fully completed → refresh CRI + skill gap + recommendations */
export const onPathwayCompleted: GlueRule<"training.pathway.completed"> = {
  id: "training.pathway.completed→cri_refresh+skill_gap+recommendations",
  description: "Refresh CRI, skill gap, and recommendations when a pathway is completed",
  trigger: EVENT_NAMES.training.pathwayCompleted,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.criRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.pathwayCompleted,
      },
    },
    {
      intent: EVENT_NAMES.intents.skillGapRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.pathwayCompleted,
      },
    },
    {
      intent: EVENT_NAMES.intents.trainingRecommendationRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.pathwayCompleted,
        skillIds: [],
      },
    },
  ],
};

/** When pathway progress is updated → mark CRI as stale */
export const onPathwayProgressUpdated: GlueRule<"training.pathway.progress_updated"> = {
  id: "training.pathway.progress_updated→cri_refresh",
  description: "Refresh CRI when pathway progress changes significantly",
  trigger: EVENT_NAMES.training.pathwayProgressUpdated,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.criRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.pathwayProgressUpdated,
      },
    },
  ],
};

/** When mentor approves evidence → refresh gaps + reputation + verified state */
export const onMentorReviewApproved: GlueRule<"training.mentor.review.approved"> = {
  id: "training.mentor.review.approved→gaps+recommendations+reputation+verified_state",
  description: "Refresh gaps, reputation, verified state; conditionally recommendations when mentor approves evidence",
  trigger: EVENT_NAMES.training.mentorReviewApproved,

  resolveContext: async (event) => {
    const [recCtx, feedback, interaction] = await Promise.all([
      readRecommendationContext(event.payload.teacherId),
      resolveTeacherFeedback(event.payload.teacherId),
      readInteractionSignals(event.payload.teacherId),
    ]);
    return { recCtx, feedback, feedbackOverlay: resolveFeedbackOverlay(feedback, interaction) };
  },

  emitIntents: (event, rawContext) => {
    const combined = rawContext as { recCtx: RecommendationGateContext; feedback: TeacherOutcomeFeedback | null; feedbackOverlay: FeedbackOverlay } | undefined;
    const ctx = combined?.recCtx;
    const feedback = combined?.feedback ?? null;
    const fbOverlay = combined?.feedbackOverlay ?? resolveFeedbackOverlay(null);
    const hasRecommendations = ctx?.hasExistingRecommendations ?? false;
    const intents: IntentEmission[] = [];
    const actions: string[] = [];

    // Log feedback if available
    if (feedback) {
      logFeedbackDecision(event.payload.teacherId, feedback, fbOverlay, "training.mentor.review.approved");
    }

    intents.push({
      intent: EVENT_NAMES.intents.skillGapRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.mentorReviewApproved,
        boostGapAligned: fbOverlay.boostGapAligned,
      },
    });
    actions.push("gap.refresh");

    // Feedback-aware: suppress recs for effective learners without gaps
    const suppressForEffective = fbOverlay.suppressLowImpact;
    if (!hasRecommendations && !suppressForEffective) {
      intents.push({
        intent: EVENT_NAMES.intents.trainingRecommendationRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.training.mentorReviewApproved,
          recommendationCap: fbOverlay.recommendationCap,
        },
      });
      actions.push("recommendation.generate");
    } else {
      actions.push(suppressForEffective ? "recommendation.suppressed_by_feedback" : "recommendation.skipped");
    }

    intents.push({
      intent: EVENT_NAMES.intents.reputationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.mentorReviewApproved,
        eventType: "evidence_approved",
      },
    });
    actions.push("reputation.refresh");

    intents.push({
      intent: EVENT_NAMES.intents.verifiedStateRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.mentorReviewApproved,
      },
    });
    actions.push("verified_state.refresh");

    logDecisionTrace({
      traceId: `rule_mentor_rev_${Date.now().toString(36)}`,
      decisionType: "evidence_approval",
      entityId: event.payload.teacherId,
      eventName: "training.mentor.review.approved",
      metadata: {
        hasRecommendations,
        actions,
      },
    });

    return intents;
  },
};

/** When verified completion occurs → refresh CRI + skill gap + recommendations */
export const onVerifiedCompletion: GlueRule<"training.verified_completion"> = {
  id: "training.verified_completion→cri+skill_gap+recommendations",
  description: "Refresh all intelligence when verified completion occurs",
  trigger: EVENT_NAMES.training.verifiedCompletion,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.criRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.verifiedCompletion,
      },
    },
    {
      intent: EVENT_NAMES.intents.skillGapRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.verifiedCompletion,
      },
    },
    {
      intent: EVENT_NAMES.intents.trainingRecommendationRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.training.verifiedCompletion,
        skillIds: [],
      },
    },
  ],
};

export const trainingRules = [
  onTrainingCompleted,
  onPathwayCompleted,
  onPathwayProgressUpdated,
  onMentorReviewApproved,
  onVerifiedCompletion,
];
