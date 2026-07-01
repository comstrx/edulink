/**
 * Smart Glue Rules — Trust Domain
 *
 * Maps trust events to intelligence/identity intents.
 * No scoring logic. No direct coupling to other domain internals.
 *
 * Sprint 8: Aligned with legacy reaction parity for safe migration.
 * Sprint 13: Decision-aware verification-completed rule.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { GlueRule } from "../types";
import { readVerificationContext, type VerificationDecisionContext } from "../intelligence/verification-context.reader";
import { resolveVerificationDecision } from "../decision-engine-school";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import { completeCredentialRecommendationsByCredentialId } from "@/intelligence/growth/growth-loop-completion.service";

/** When verification completes (approved) → Decision Engine–driven response (Sprint 13) */
export const onVerificationApproved: GlueRule<"trust.verification_completed"> = {
  id: "trust.verification_completed[approved]→decision_engine",
  description: "Decision Engine–driven trust/visibility response on verification approval (Sprint 13)",
  trigger: EVENT_NAMES.trust.verificationCompleted,
  condition: (event) => event.payload.status === "approved",

  resolveContext: async (event) => {
    return readVerificationContext(event.payload.teacherId);
  },

  emitIntents: (event, rawContext) => {
    const ctx = rawContext as VerificationDecisionContext | undefined;
    const decision = resolveVerificationDecision(ctx);

    const intents = [];

    // Always: refresh verified state
    if (decision.shouldRefreshTrust) {
      intents.push({
        intent: EVENT_NAMES.intents.verifiedStateRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.trust.verificationCompleted,
          priority: decision.priority,
        },
      });
    }

    // Conditional: CRI refresh
    if (decision.shouldRefreshCri) {
      intents.push({
        intent: EVENT_NAMES.intents.criRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.trust.verificationCompleted,
        },
      });
    }

    // Conditional: Gap refresh (only if unresolved gaps exist)
    if (decision.shouldRefreshGaps) {
      intents.push({
        intent: EVENT_NAMES.intents.skillGapRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.trust.verificationCompleted,
        },
      });
    }

    // Conditional: Boost visibility via talent profile refresh
    if (decision.shouldBoostVisibility) {
      intents.push({
        intent: EVENT_NAMES.intents.talentProfileRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.trust.verificationCompleted,
          visibilityBoost: true,
        },
      });
    }

    // Conditional: Suppress beginner guidance — skip recommendation refresh
    if (!decision.suppressBeginnerGuidance) {
      // Only add recommendation refresh if we're NOT suppressing
      // (no-op — we don't add rec intents by default for verification)
    }

    // Observability — Admin intelligence path
    logDecisionTrace({
      traceId: `rule_verif_${Date.now().toString(36)}`,
      decisionType: "verification",
      entityId: event.payload.teacherId,
      eventName: EVENT_NAMES.trust.verificationCompleted,
      metadata: {
        verificationType: event.payload.verificationType,
        trustRefresh: decision.shouldRefreshTrust,
        visibilityBoost: decision.shouldBoostVisibility,
        suppressBeginner: decision.suppressBeginnerGuidance,
        criRefresh: decision.shouldRefreshCri,
        gapRefresh: decision.shouldRefreshGaps,
        priority: decision.priority,
        intentsEmitted: intents.length,
      },
    });

    return intents.slice(0, decision.maxIntents);
  },
};

/** When verification is rejected → refresh gaps (verification gap may now exist) */
export const onVerificationRejected: GlueRule<"trust.verification_completed"> = {
  id: "trust.verification_completed[rejected]→gap_refresh",
  description: "Refresh gaps when verification is rejected",
  trigger: EVENT_NAMES.trust.verificationCompleted,
  condition: (event) => event.payload.status === "rejected",
  emitIntents: (event) => {
    logDecisionTrace({
      traceId: `rule_verif_rej_${Date.now().toString(36)}`,
      decisionType: "verification",
      entityId: event.payload.teacherId,
      eventName: EVENT_NAMES.trust.verificationCompleted,
      metadata: {
        verificationType: event.payload.verificationType,
        status: "rejected",
        refreshScope: "gap_only",
        intentsEmitted: 1,
      },
    });
    return [
      {
        intent: EVENT_NAMES.intents.skillGapRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.trust.verificationCompleted,
          triggerStatus: "rejected",
        },
      },
    ];
  },
};

/** When a credential is issued → refresh CRI + reputation */
export const onCredentialIssued: GlueRule<"trust.credential_issued"> = {
  id: "trust.credential_issued→cri+reputation",
  description: "Refresh CRI and reputation when a credential is issued",
  trigger: EVENT_NAMES.trust.credentialIssued,
  emitIntents: (event) => {
    logDecisionTrace({
      traceId: `rule_cred_${Date.now().toString(36)}`,
      decisionType: "verification",
      entityId: event.payload.teacherId,
      eventName: EVENT_NAMES.trust.credentialIssued,
      metadata: {
        credentialId: event.payload.credentialId,
        intentsEmitted: 2,
      },
    });
    // Close credential feedback loop: mark matching growth recs as completed
    completeCredentialRecommendationsByCredentialId(
      event.payload.teacherId,
      event.payload.credentialId,
    ).catch(() => {});
    return [
      {
        intent: EVENT_NAMES.intents.criRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.trust.credentialIssued,
        },
      },
      {
        intent: EVENT_NAMES.intents.reputationRefreshRequested,
        payload: {
          teacherId: event.payload.teacherId,
          triggeredBy: EVENT_NAMES.trust.credentialIssued,
          eventType: "credential_issued",
        },
      },
    ];
  },
};

export const trustRules = [onVerificationApproved, onVerificationRejected, onCredentialIssued];
