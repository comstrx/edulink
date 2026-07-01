/**
 * Smart Glue Rules — Hiring Domain
 *
 * Maps hiring events to intelligence/trust intents.
 * No scoring logic. No direct coupling to Training internals.
 *
 * Sprint 9: onApplicationRejected is intelligence-aware.
 * Sprint 10: Refactored to use Decision Engine for prioritization.
 * Sprint 12: Cross-domain decision overlay for multi-signal reasoning.
 * Sprint 13: Decision-aware job-published rule.
 * Sprint 15: Outcome feedback overlay — learns from rejection outcomes.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule } from "../types";
import {
  readRejectionContext,
  type RejectionIntelligenceContext,
} from "../intelligence/rejection-context.reader";
import { resolveCrossDomainContext, type CrossDomainContext } from "../intelligence/cross-domain-context.reader";
import { buildAggregatedEventContext, type AggregatedEventContext, type RecentEventContext, type CrossDomainSummary } from "../intelligence/aggregated-event-context.reader";
import { readJobPublishContext, type JobPublishDecisionContext } from "../intelligence/job-publish-context.reader";
import { resolveRejectionDecision, resolveCrossDomainDecision, resolveRejectionMultiEventModifier, resolveContextualPriority, resolveRejectionCrossDomainModifier, resolveRecommendationTargeting } from "../decision-engine";
import { resolveJobPublishDecision } from "../decision-engine-school";
import { applyDecisionSafety } from "../decision-safety";
import { resolveTeacherFeedback } from "@/intelligence/outcomes/outcome-signal.service";
import { resolveFeedbackOverlay, logFeedbackDecision } from "@/intelligence/outcomes/feedback-decision-overlay";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import type { TeacherOutcomeFeedback } from "@/intelligence/outcomes/outcome.types";
import type { FeedbackOverlay } from "@/intelligence/outcomes/feedback-decision-overlay";
import { readInteractionSignals } from "@/intelligence/feedback/interaction-signal.reader";

// ── Combined context for rejection ────────────────────────────

interface RejectionCombinedContext {
  local: RejectionIntelligenceContext;
  crossDomain: CrossDomainContext;
  recentEvents: RecentEventContext;
  crossDomainSummary: CrossDomainSummary;
  feedback: TeacherOutcomeFeedback | null;
  feedbackOverlay: FeedbackOverlay;
}


/** When a teacher applies → refresh CRI, gaps, match, and reputation */
export const onJobApplied: GlueRule<"hiring.job_applied"> = {
  id: "hiring.job_applied→cri+gaps+match+reputation",
  description: "Refresh CRI, gaps, match, and reputation when teacher applies to a job",
  trigger: EVENT_NAMES.hiring.jobApplied,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.criRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        jobId: event.payload.jobId,
        triggeredBy: EVENT_NAMES.hiring.jobApplied,
      },
    },
    {
      intent: EVENT_NAMES.intents.skillGapRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.hiring.jobApplied,
      },
    },
    {
      intent: EVENT_NAMES.intents.matchRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        jobId: event.payload.jobId,
        triggeredBy: EVENT_NAMES.hiring.jobApplied,
      },
    },
    {
      intent: EVENT_NAMES.intents.reputationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.hiring.jobApplied,
        eventType: "job_applied",
      },
    },
  ],
};

/**
 * When application is rejected → Decision Engine + Cross-Domain overlay (Sprint 12).
 *
 * Flow: event → local decision → cross-domain adjustment → final actions
 */
export const onApplicationRejected: GlueRule<"hiring.application_rejected"> = {
  id: "hiring.application_rejected→decision_engine",
  description: "Decision Engine–driven growth response on application rejection (cross-domain aware)",
  trigger: EVENT_NAMES.hiring.applicationRejected,

  resolveContext: async (event) => {
    const [local, aggregated, feedback, interaction] = await Promise.all([
      readRejectionContext(event.payload.teacherId, event.payload.jobId),
      buildAggregatedEventContext(event.payload.teacherId, event.payload.jobId),
      resolveTeacherFeedback(event.payload.teacherId),
      readInteractionSignals(event.payload.teacherId),
    ]);
    const feedbackOverlay = resolveFeedbackOverlay(feedback, interaction);
    return {
      local,
      crossDomain: aggregated.intelligence,
      recentEvents: aggregated.recentEvents,
      crossDomainSummary: aggregated.summary,
      feedback,
      feedbackOverlay,
    } as RejectionCombinedContext;
  },

  emitIntents: (event, rawContext) => {
    const combined = rawContext as RejectionCombinedContext | undefined;
    const localCtx = combined?.local;
    const crossCtx = combined?.crossDomain;
    const recentEvents = combined?.recentEvents;
    const cdSummary = combined?.crossDomainSummary;
    const feedback = combined?.feedback ?? null;
    const fbOverlay = combined?.feedbackOverlay ?? resolveFeedbackOverlay(null);

    // TraceId: generated once at rule entry (Sprint 5.2)
    const traceId = `rule_rej_${Date.now().toString(36)}`;

    // Step 1: Local decision (Sprint 10)
    const decision = resolveRejectionDecision(localCtx, traceId);

    // Step 2: Cross-domain decision (Sprint 12)
    const crossDecision = resolveCrossDomainDecision(crossCtx, traceId);

    // Step 2.5: Multi-event modifier (Sprint 4.2)
    const multiEvent = resolveRejectionMultiEventModifier(
      recentEvents,
      crossCtx?.gaps.totalGaps ?? 0,
      crossCtx?.cri.score ?? null,
    );

    // Step 2.6: Cross-domain modifier (Sprint 4.3)
    const crossDomainMod = resolveRejectionCrossDomainModifier(
      recentEvents?.hasRecentRejection ?? false,
      crossCtx?.gaps.totalGaps ?? 0,
      cdSummary?.recentCompletionsCount ?? 0,
      cdSummary?.verificationRatio ?? 0,
      cdSummary?.hasVerifiedCredentials ?? false,
    );

    // Step 2.7: Recommendation targeting (Sprint 4.3 Step 4)
    const targeting = resolveRecommendationTargeting(
      crossCtx?.gaps.topGaps.map(g => g.termId) ?? [],
      crossCtx?.gaps.categories ?? [],
      cdSummary?.verificationRatio ?? 0,
      cdSummary?.hasVerifiedCredentials ?? false,
      (cdSummary as any)?.completedTrainingTermIds ?? [],
      crossCtx?.gaps.totalGaps ?? 0,
    );

    // Step 3: Feedback overlay (Sprint 15)
    if (feedback) {
      logFeedbackDecision(event.payload.teacherId, feedback, fbOverlay, "hiring.application_rejected");
    }

    const intents = [];

    // Step 3.5: Contextual priority (Sprint 4.2 Step 3)
    const contextualPriority = resolveContextualPriority(
      crossCtx?.cri.score ?? null,
      crossCtx?.gaps.totalGaps ?? 0,
      recentEvents?.hasRecentRejection ?? false,
      multiEvent.boostPriority,
      crossDomainMod.boostRecommendationPriority,
    );
    const effectivePriority = fbOverlay.priorityOverride ?? contextualPriority.priority;
    const priorityMeta = {
      priority: effectivePriority,
      contextualPriority: contextualPriority.priority,
      focusGap: decision.topGap ?? undefined,
      learnerBand: feedback?.learnerBand,
      improvementScore: feedback?.improvementAfterRejectionScore,
      multiEventApplied: multiEvent.applied,
      crossDomainApplied: crossDomainMod.applied,
    };

    // ── Always: refresh gaps ──
    intents.push({
      intent: EVENT_NAMES.intents.skillGapRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.hiring.applicationRejected,
        topGapTermId: decision.topGap?.termId ?? null,
        boostGapAligned: fbOverlay.boostGapAligned,
        ...priorityMeta,
      },
    });

    // ── Conditional: generate recommendations if none exist ──
    // Multi-event: force generation when rejection + gaps detected
    // Feedback-aware: suppress if low-impact OR cap based on learner band
    const suppressRecsForFeedback = fbOverlay.suppressLowImpact && !decision.topGap;
    const shouldGenerateRecs = (decision.shouldGenerateRecommendations || multiEvent.forceRecommendations) && !suppressRecsForFeedback;
    if (shouldGenerateRecs) {
      const targetingMeta = targeting.applied
        ? {
            targetGapTermIds: targeting.gapTermIds,
            targetGapCategories: targeting.gapCategories,
            trustLevel: targeting.trustLevel,
            excludeCompletedTermIds: targeting.excludeCompletedTermIds,
          }
        : {};

      intents.push({
        intent: EVENT_NAMES.intents.trainingRecommendationRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.hiring.applicationRejected,
          topGapTermId: decision.topGap?.termId ?? null,
          recommendationCap: fbOverlay.recommendationCap,
          boostProviderRecommendations: fbOverlay.boostProviderRecommendations,
          focusOnGapAligned: crossDomainMod.focusOnGapAligned,
          crossDomainBoostPriority: crossDomainMod.boostRecommendationPriority,
          ...targetingMeta,
          ...priorityMeta,
        },
      });
      intents.push({
        intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.hiring.applicationRejected,
          rejectionReasonTermId: event.payload.rejectionReasonTermId,
          jobId: event.payload.jobId,
          topGapTermId: decision.topGap?.termId ?? null,
          recommendationCap: fbOverlay.recommendationCap,
          focusOnGapAligned: crossDomainMod.focusOnGapAligned,
          crossDomainBoostPriority: crossDomainMod.boostRecommendationPriority,
          ...targetingMeta,
          ...priorityMeta,
        },
      });
    }

    // ── Conditional: CRI refresh (multi-event can force this) ──
    if (decision.shouldRefreshCri || multiEvent.forceCriRefresh) {
      intents.push({
        intent: EVENT_NAMES.intents.criRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          jobId: event.payload.jobId,
          triggeredBy: EVENT_NAMES.hiring.applicationRejected,
          feedbackCriModifier: fbOverlay.criPriorityModifier,
          multiEventForced: multiEvent.forceCriRefresh,
          ...priorityMeta,
        },
      });
    }

    // ── Cross-domain: boost matching if scenario or cross-domain modifier indicates ──
    if (crossDecision.boostMatching || crossDomainMod.boostMatchRefresh) {
      intents.push({
        intent: EVENT_NAMES.intents.matchRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          jobId: event.payload.jobId,
          triggeredBy: EVENT_NAMES.hiring.applicationRejected,
          crossDomainBoost: true,
          trustImprovedBoost: crossDomainMod.boostMatchRefresh,
        },
      });
    }

    // Step 4+5: Safety pipeline (overlay → dedup → conflicts → budget)
    const safetyResult = applyDecisionSafety({
      intents,
      crossDecision,
      maxIntents: decision.maxIntents,
      eventName: "application_rejected",
      entityId: event.payload.teacherId,
        traceId,
    });

    // ── Decision Log ──
    logDecisionTrace({
      traceId,
      decisionType: "rejection",
      entityId: event.payload.teacherId,
      eventName: "application_rejected",
      metadata: {
        topGap: decision.topGap?.category ?? null,
        crossDomainScenario: crossDecision.scenario,
        multiEventApplied: multiEvent.applied,
        crossDomainModApplied: crossDomainMod.applied,
        intentsRequested: intents.length,
        intentsEmitted: safetyResult.intents.length,
      },
    });

    return safetyResult.intents;
  },
};

/** When application is withdrawn → refresh CRI */
export const onApplicationWithdrawn: GlueRule<"hiring.application.status_changed"> = {
  id: "hiring.status_changed[withdrawn]→cri_refresh",
  description: "Refresh CRI when teacher withdraws application",
  trigger: EVENT_NAMES.hiring.applicationStatusChanged,
  condition: (event) => event.payload.newStatus === "withdrawn",
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.criRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId ?? "",
        jobId: event.payload.jobId ?? null,
        triggeredBy: EVENT_NAMES.hiring.applicationStatusChanged,
      },
    },
  ],
};

/**
 * When a job is published → Decision Engine–driven match + workforce refresh (Sprint 13).
 *
 * Flow: event → context → decision → targeted intents → safety pipeline
 */
export const onJobPublished: GlueRule<"hiring.job_published"> = {
  id: "hiring.job_published→decision_engine",
  description: "Decision Engine–driven match/workforce refresh on job publish (Sprint 13)",
  trigger: EVENT_NAMES.hiring.jobPublished,

  resolveContext: async (event) => {
    return readJobPublishContext(event.payload.jobId, event.payload.schoolId);
  },

  emitIntents: (event, rawContext) => {
    const ctx = rawContext as JobPublishDecisionContext | undefined;
    const decision = resolveJobPublishDecision(ctx);

    const intents = [];

    // Always: match refresh (scope determined by decision)
    intents.push({
      intent: EVENT_NAMES.intents.matchRefreshRequested,
      payload: {
        jobId: event.payload.jobId,
        triggeredBy: EVENT_NAMES.hiring.jobPublished,
        matchRefreshScope: decision.matchRefreshScope,
        prioritizeVerified: decision.prioritizeVerified,
        priority: decision.priority,
      },
    });

    // Workforce refresh (school team summaries)
    if (decision.shouldRefreshWorkforce) {
      intents.push({
        intent: EVENT_NAMES.intents.workforceRefreshRequested,
        payload: {
          teacherId: "__school__",
          schoolId: event.payload.schoolId,
          triggeredBy: EVENT_NAMES.hiring.jobPublished,
        },
      });
    }

    // Suppress gap refresh if job is untargeted (no subject terms)
    if (!decision.suppressLowValueRefreshes) {
      intents.push({
        intent: EVENT_NAMES.intents.skillGapRefreshRequested,
        payload: {
          teacherId: "__school__",
          jobId: event.payload.jobId,
          triggeredBy: EVENT_NAMES.hiring.jobPublished,
        },
      });
    }

    // Observability — School intelligence path
    logDecisionTrace({
      traceId: `rule_job_${Date.now().toString(36)}`,
      decisionType: "job_publish",
      entityId: event.payload.jobId,
      eventName: EVENT_NAMES.hiring.jobPublished,
      metadata: {
        schoolId: event.payload.schoolId,
        matchRefreshScope: decision.matchRefreshScope,
        prioritizeVerified: decision.prioritizeVerified,
        suppressLowValue: decision.suppressLowValueRefreshes,
        intentsEmitted: intents.length,
      },
    });

    return intents.slice(0, decision.maxIntents);
  },
};

/** When application is accepted (offer extended) → refresh CRI + recommendations — Sprint 1 */
export const onApplicationAccepted: GlueRule<"hiring.application_accepted"> = {
  id: "hiring.application_accepted→cri+recommendations",
  description: "Refresh CRI and recommendations when application is accepted",
  trigger: EVENT_NAMES.hiring.applicationAccepted,
  emitIntents: (event) => {
    logDecisionTrace({
      traceId: `rule_accept_${Date.now().toString(36)}`,
      decisionType: "acceptance",
      entityId: event.payload.teacherId,
      eventName: "hiring.application_accepted",
      metadata: { jobId: event.payload.jobId, intentsEmitted: 3 },
    });
    return [
      {
        intent: EVENT_NAMES.intents.criRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.hiring.applicationAccepted,
        },
      },
      {
        intent: EVENT_NAMES.intents.trainingRecommendationRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.hiring.applicationAccepted,
          skillIds: [],
        },
      },
      {
        intent: EVENT_NAMES.intents.reputationRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.hiring.applicationAccepted,
          eventType: "application_accepted",
        },
      },
    ];
  },
};

/** When interview is scheduled → refresh match + CRI — Sprint 1 */
export const onInterviewScheduled: GlueRule<"hiring.interview_scheduled"> = {
  id: "hiring.interview_scheduled→match+cri",
  description: "Refresh match and CRI when interview is scheduled",
  trigger: EVENT_NAMES.hiring.interviewScheduled,
  emitIntents: (event) => {
    logDecisionTrace({
      traceId: `rule_interview_${Date.now().toString(36)}`,
      decisionType: "interview",
      entityId: event.payload.teacherId,
      eventName: "hiring.interview_scheduled",
      metadata: { jobId: event.payload.jobId, intentsEmitted: 2 },
    });
    return [
      {
        intent: EVENT_NAMES.intents.matchRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          jobId: event.payload.jobId,
          triggeredBy: EVENT_NAMES.hiring.interviewScheduled,
        },
      },
      {
        intent: EVENT_NAMES.intents.criRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.hiring.interviewScheduled,
        },
      },
    ];
  },
};

export const hiringRules = [
  onJobApplied,
  onApplicationRejected,
  onApplicationAccepted,
  onInterviewScheduled,
  onApplicationWithdrawn,
  onJobPublished,
];
