/**
 * Sprint 9 — Hiring → Growth Intelligence-Aware Decision Tests
 *
 * Validates that the rejection rule emits intents selectively
 * based on existing intelligence state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { DomainEvent } from "@/contracts/core/domain-event";
import type { ApplicationRejectedPayload } from "@/contracts/hiring/hiring.contracts";
import type { RejectionIntelligenceContext } from "@/smart-glue/intelligence/rejection-context.reader";
import { onApplicationRejected } from "@/smart-glue/rules/hiring-rules";
import { resolveFeedbackOverlay } from "@/intelligence/outcomes/feedback-decision-overlay";

// ── Helpers ────────────────────────────────────────────────────

const TEACHER_ID = "teacher-decision-001";
const JOB_ID = "job-decision-001";

function makeRejectedEvent(): DomainEvent<ApplicationRejectedPayload> {
  return {
    event: EVENT_NAMES.hiring.applicationRejected,
    domain: "hiring",
    version: 1,
    timestamp: new Date().toISOString(),
    payload: {
      applicationId: "app-001",
      teacherId: TEACHER_ID,
      jobId: JOB_ID,
      rejectionReasonTermId: "term-missing-cert",
      rejectedAt: new Date().toISOString(),
    },
  };
}

/**
 * Wraps RejectionIntelligenceContext into the RejectionCombinedContext
 * shape expected by the rule's emitIntents.
 */
function wrapContext(local: RejectionIntelligenceContext) {
  return {
    local,
    crossDomain: undefined,
    feedback: null,
    feedbackOverlay: resolveFeedbackOverlay(null),
  };
}

function makeContext(overrides: Partial<RejectionIntelligenceContext> = {}): RejectionIntelligenceContext {
  return {
    hasIntelligence: true,
    gaps: { available: false, totalGaps: 0, topGaps: [], categories: [] },
    recommendations: { available: false, totalCount: 0, hasExistingRecommendations: false },
    cri: { available: false, score: null, gapTermIds: [] },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe("Sprint 9 — Rejection Decision Logic", () => {
  const event = makeRejectedEvent();

  describe("Case 1: Teacher rejected + no recommendations", () => {
    it("emits gap refresh + recommendation generation + growth refresh", () => {
      const ctx = makeContext({
        recommendations: { available: true, totalCount: 0, hasExistingRecommendations: false },
      });

      const intents = onApplicationRejected.emitIntents(event, wrapContext(ctx));
      const intentNames = intents.map((i) => i.intent);

      expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
      expect(intentNames).toContain(EVENT_NAMES.intents.trainingRecommendationRequested);
      expect(intentNames).toContain(EVENT_NAMES.intents.growthRecommendationRefreshRequested);
    });
  });

  describe("Case 2: Teacher rejected + already has recommendations", () => {
    it("emits gap refresh but SKIPS recommendation generation", () => {
      const ctx = makeContext({
        recommendations: { available: true, totalCount: 3, hasExistingRecommendations: true },
      });

      const intents = onApplicationRejected.emitIntents(event, wrapContext(ctx));
      const intentNames = intents.map((i) => i.intent);

      expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
      expect(intentNames).not.toContain(EVENT_NAMES.intents.trainingRecommendationRequested);
      expect(intentNames).not.toContain(EVENT_NAMES.intents.growthRecommendationRefreshRequested);
    });
  });

  describe("Case 3: Teacher rejected + gaps exist", () => {
    it("emits gap refresh regardless of existing gaps", () => {
      const ctx = makeContext({
        gaps: { available: true, totalGaps: 2, topGaps: [], categories: ["subject"] },
        recommendations: { available: true, totalCount: 1, hasExistingRecommendations: true },
      });

      const intents = onApplicationRejected.emitIntents(event, wrapContext(ctx));
      const intentNames = intents.map((i) => i.intent);

      expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
    });

    it("adds CRI refresh when ≥3 gaps exist", () => {
      const ctx = makeContext({
        gaps: { available: true, totalGaps: 4, topGaps: [], categories: ["subject", "certification"] },
        recommendations: { available: true, totalCount: 1, hasExistingRecommendations: true },
      });

      const intents = onApplicationRejected.emitIntents(event, wrapContext(ctx));
      const intentNames = intents.map((i) => i.intent);

      expect(intentNames).toContain(EVENT_NAMES.intents.criRefreshRequested);
    });

    it("does NOT add CRI refresh when <3 gaps", () => {
      const ctx = makeContext({
        gaps: { available: true, totalGaps: 2, topGaps: [], categories: ["subject"] },
        recommendations: { available: true, totalCount: 1, hasExistingRecommendations: true },
      });

      const intents = onApplicationRejected.emitIntents(event, wrapContext(ctx));
      const intentNames = intents.map((i) => i.intent);

      expect(intentNames).not.toContain(EVENT_NAMES.intents.criRefreshRequested);
    });
  });

  describe("Fallback: no context available", () => {
    it("emits baseline intents when context is undefined", () => {
      const intents = onApplicationRejected.emitIntents(event, undefined);
      const intentNames = intents.map((i) => i.intent);

      // No context → hasExistingRecommendations is false → generates recommendations
      expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
      expect(intentNames).toContain(EVENT_NAMES.intents.trainingRecommendationRequested);
      expect(intentNames).toContain(EVENT_NAMES.intents.growthRecommendationRefreshRequested);
    });
  });
});
