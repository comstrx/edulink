/**
 * Smart Glue Rules — Mentorship Domain
 *
 * Maps mentorship events to intelligence intents.
 * No scoring logic. No direct coupling to domain internals.
 *
 * Sprint 11: evidence.approved uses Decision Engine for redundancy-aware logic.
 * Sprint 12: Cross-domain decision overlay for multi-signal reasoning.
 * Sprint 15: Outcome feedback overlay — learns from mentorship outcomes.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule, IntentEmission } from "../types";
import {
  readEvidenceApprovalContext,
  type EvidenceApprovalDecisionContext,
} from "../intelligence/evidence-approval-context.reader";
import { resolveCrossDomainContext, type CrossDomainContext } from "../intelligence/cross-domain-context.reader";
import { resolveEvidenceApprovalDecision, resolveCrossDomainDecision } from "../decision-engine";
import { applyDecisionSafety } from "../decision-safety";
import { resolveTeacherFeedback, detectTrustImprovementOutcome } from "@/intelligence/outcomes/outcome-signal.service";
import { resolveFeedbackOverlay, logFeedbackDecision } from "@/intelligence/outcomes/feedback-decision-overlay";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import type { TeacherOutcomeFeedback } from "@/intelligence/outcomes/outcome.types";
import type { FeedbackOverlay } from "@/intelligence/outcomes/feedback-decision-overlay";
import { readInteractionSignals } from "@/intelligence/feedback/interaction-signal.reader";

// ── Combined context ──────────────────────────────────────────

interface EvidenceCombinedContext {
  local: EvidenceApprovalDecisionContext;
  crossDomain: CrossDomainContext;
  feedback: TeacherOutcomeFeedback | null;
  feedbackOverlay: FeedbackOverlay;
}


/** Session completed → timeline + growth recommendations (no CRI impact) */
export const onMentorSessionCompleted: GlueRule<typeof EVENT_NAMES.mentorship.sessionCompleted> = {
  id: "mentorship.session.completed→growth",
  description: "Refresh growth recommendations when a mentor session is completed",
  trigger: EVENT_NAMES.mentorship.sessionCompleted,
  emitIntents: (event) => [
    {
      intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
      payload: {
        teacherId: event.payload.teacherId,
        triggeredBy: EVENT_NAMES.mentorship.sessionCompleted,
      },
    },
  ],
};

/** Evidence submitted → no intelligence impact (intentional no-op) */
export const onMentorshipEvidenceSubmitted: GlueRule<typeof EVENT_NAMES.mentorship.evidenceSubmitted> = {
  id: "mentorship.evidence.submitted→queue",
  description: "[Intentional no-op] Evidence submitted — mentor review queue updated, no intelligence impact",
  trigger: EVENT_NAMES.mentorship.evidenceSubmitted,
  emitIntents: () => [],
};

/** Evidence approved → Decision Engine + Cross-Domain overlay (Sprint 12) */
export const onMentorshipEvidenceApproved: GlueRule<typeof EVENT_NAMES.mentorship.evidenceApproved> = {
  id: "mentorship.evidence.approved→decision_engine",
  description: "Decision Engine–driven trust/talent/growth response on evidence approval (cross-domain aware)",
  trigger: EVENT_NAMES.mentorship.evidenceApproved,

  resolveContext: async (event) => {
    const [local, crossDomain, feedback, trustOutcome, interaction] = await Promise.all([
      readEvidenceApprovalContext(event.payload.teacherId, event.payload.competencyTermIds),
      resolveCrossDomainContext(event.payload.teacherId),
      resolveTeacherFeedback(event.payload.teacherId),
      detectTrustImprovementOutcome(event.payload.teacherId),
      readInteractionSignals(event.payload.teacherId),
    ]);

    // Log outcome signal if detected
    if (trustOutcome) {
      logDecisionTrace({ traceId: `ctx_evid_${Date.now().toString(36)}`, decisionType: "feedback_overlay", metadata: { outcomeType: trustOutcome.outcomeType, reasoning: trustOutcome.reasoning } });
    }

    const feedbackOverlay = resolveFeedbackOverlay(feedback, interaction);
    return { local, crossDomain, feedback, feedbackOverlay } as EvidenceCombinedContext;
  },

  emitIntents: (event, rawContext) => {
    const combined = rawContext as EvidenceCombinedContext | undefined;
    const localCtx = combined?.local;
    const crossCtx = combined?.crossDomain;
    const feedback = combined?.feedback ?? null;
    const fbOverlay = combined?.feedbackOverlay ?? resolveFeedbackOverlay(null);

    // TraceId: generated once at rule entry (Sprint 5.2)
    const traceId = `rule_evid_${Date.now().toString(36)}`;

    // Step 1: Local decision
    const decision = resolveEvidenceApprovalDecision(localCtx, traceId);

    // Step 2: Cross-domain decision
    const crossDecision = resolveCrossDomainDecision(crossCtx, traceId);

    // Step 3: Feedback overlay (Sprint 15)
    if (feedback) {
      logFeedbackDecision(event.payload.teacherId, feedback, fbOverlay, "mentorship.evidence.approved");
    }

    const effectivePriority = fbOverlay.priorityOverride ?? decision.priority;

    const intents: IntentEmission[] = [];
    const actions: string[] = [];
    const priorityMeta = {
      priority: effectivePriority,
      learnerBand: feedback?.learnerBand,
    };

    // CRI refresh (non-redundant, feedback-aware modifier)
    if (!decision.isRedundant) {
      intents.push({
        intent: EVENT_NAMES.intents.criRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.mentorship.evidenceApproved,
          feedbackCriModifier: fbOverlay.criPriorityModifier,
          ...priorityMeta,
        },
      });
      actions.push("cri.refresh");
    }

    // Talent profile refresh
    if (decision.shouldRefreshTalent) {
      intents.push({
        intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.mentorship.evidenceApproved,
          ...priorityMeta,
        },
      });
      actions.push("talent.refresh");
    } else {
      actions.push("talent.skipped");
    }

    // Growth recommendations — feedback-aware suppression
    const suppressRecsForFeedback = fbOverlay.suppressLowImpact;
    if (decision.shouldGenerateRecommendations && !suppressRecsForFeedback) {
      intents.push({
        intent: EVENT_NAMES.intents.growthRecommendationRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.mentorship.evidenceApproved,
          recommendationCap: fbOverlay.recommendationCap,
          boostProviderRecommendations: fbOverlay.boostProviderRecommendations,
          ...priorityMeta,
        },
      });
      actions.push("growth.generate");
    } else {
      actions.push(suppressRecsForFeedback ? "growth.suppressed_by_feedback" : "growth.skipped");
    }

    // Teacher trust refresh
    if (decision.shouldRefreshTrust) {
      intents.push({
        intent: EVENT_NAMES.intents.teacherTrustRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.mentorship.evidenceApproved,
          ...priorityMeta,
        },
      });
      actions.push("teacher_trust.refresh");
    } else {
      actions.push("teacher_trust.skipped");
    }

    // Mentor reputation (always)
    if (decision.shouldRefreshMentorReputation) {
      intents.push({
        intent: EVENT_NAMES.intents.mentorReputationRefreshRequested,
        payload: {
          mentorId: event.payload.mentorId,
          triggeredBy: EVENT_NAMES.mentorship.evidenceApproved,
          ...priorityMeta,
        },
      });
      actions.push("mentor_reputation.refresh");
    }

    // Step 4+5: Safety pipeline
    const safetyResult = applyDecisionSafety({
      intents,
      crossDecision,
      maxIntents: decision.maxIntents,
      eventName: "mentorship.evidence.approved",
      entityId: event.payload.teacherId,
        traceId,
    });

    logDecisionTrace({
      traceId,
      decisionType: "evidence_approval",
      entityId: event.payload.teacherId,
      eventName: "mentorship.evidence.approved",
      metadata: {
        isRedundant: decision.isRedundant,
        priority: effectivePriority,
        crossDomainScenario: crossDecision.scenario,
        intentsRequested: intents.length,
        intentsEmitted: safetyResult.intents.length,
        actions,
      },
    });

    return safetyResult.intents;
  },
};

/** Evidence rejected → no intelligence impact (intentional no-op) */
export const onMentorshipEvidenceRejected: GlueRule<typeof EVENT_NAMES.mentorship.evidenceRejected> = {
  id: "mentorship.evidence.rejected→noop",
  description: "[Intentional no-op] Rejected mentorship evidence — feedback only, no intelligence impact",
  trigger: EVENT_NAMES.mentorship.evidenceRejected,
  emitIntents: () => [],
};

export const mentorshipRules = [
  onMentorSessionCompleted,
  onMentorshipEvidenceSubmitted,
  onMentorshipEvidenceApproved,
  onMentorshipEvidenceRejected,
];
