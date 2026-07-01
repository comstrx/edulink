/**
 * Admin Signal Activation Tests — Sprint 13
 *
 * Verifies that admin-authority actions flow through Smart Glue
 * and produce the correct intelligence intents.
 */

import { describe, it, expect } from "vitest";
import { createDomainEvent } from "@/contracts/core/domain-event";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { dispatch, dedupeIntents } from "@/smart-glue/dispatcher";
import {
  onAdminReviewApproved,
  onAdminReviewRejected,
  onAdminContentApproved,
} from "@/smart-glue/rules/admin-rules";
import type {
  AdminReviewApprovedPayload,
  AdminReviewRejectedPayload,
  AdminContentApprovedPayload,
} from "@/contracts/admin/admin.contracts";

// ── Helper ─────────────────────────────────────────────────────

function makeEvent<T>(payload: T) {
  return createDomainEvent("admin", "test", payload);
}

// ── Rule Unit Tests ────────────────────────────────────────────

describe("Admin Smart Glue Rules", () => {
  describe("onAdminReviewApproved", () => {
    const payload: AdminReviewApprovedPayload = {
      reviewId: "rev-1",
      mentorId: "mentor-1",
      sessionId: "sess-1",
      reviewerUserId: "user-1",
      approvedAt: "2026-03-21T00:00:00Z",
    };

    it("triggers on admin.review_approved", () => {
      expect(onAdminReviewApproved.trigger).toBe(EVENT_NAMES.admin.reviewApproved);
    });

    it("emits mentorReputationRefreshRequested", () => {
      const event = makeEvent(payload);
      const intents = onAdminReviewApproved.emitIntents(event as any);
      expect(intents).toHaveLength(1);
      expect(intents[0].intent).toBe(EVENT_NAMES.intents.mentorReputationRefreshRequested);
      expect(intents[0].payload).toEqual({
        mentorId: "mentor-1",
        triggeredBy: EVENT_NAMES.admin.reviewApproved,
      });
    });
  });

  describe("onAdminReviewRejected", () => {
    const payload: AdminReviewRejectedPayload = {
      reviewId: "rev-2",
      mentorId: "mentor-2",
      sessionId: "sess-2",
      reviewerUserId: "user-1",
      rejectedAt: "2026-03-21T00:00:00Z",
    };

    it("triggers on admin.review_rejected", () => {
      expect(onAdminReviewRejected.trigger).toBe(EVENT_NAMES.admin.reviewRejected);
    });

    it("emits mentorReputationRefreshRequested", () => {
      const event = makeEvent(payload);
      const intents = onAdminReviewRejected.emitIntents(event as any);
      expect(intents).toHaveLength(1);
      expect(intents[0].intent).toBe(EVENT_NAMES.intents.mentorReputationRefreshRequested);
      expect(intents[0].payload).toEqual({
        mentorId: "mentor-2",
        triggeredBy: EVENT_NAMES.admin.reviewRejected,
      });
    });
  });

  describe("onAdminContentApproved", () => {
    const payload: AdminContentApprovedPayload = {
      itemId: "item-1",
      providerId: "prov-1",
      approvedBy: "admin-1",
      approvedAt: "2026-03-21T00:00:00Z",
    };

    it("triggers on admin.content_approved", () => {
      expect(onAdminContentApproved.trigger).toBe(EVENT_NAMES.admin.contentApproved);
    });

    it("emits workforceRefreshRequested", () => {
      const event = makeEvent(payload);
      const intents = onAdminContentApproved.emitIntents(event as any);
      expect(intents).toHaveLength(1);
      expect(intents[0].intent).toBe(EVENT_NAMES.intents.workforceRefreshRequested);
      expect(intents[0].payload.triggeredBy).toBe(EVENT_NAMES.admin.contentApproved);
    });
  });
});

// ── Dispatcher Integration Tests ───────────────────────────────

describe("Admin Signal → Dispatcher Integration", () => {
  it("dispatches admin.review_approved and produces mentor reputation intent", async () => {
    const result = await dispatch(EVENT_NAMES.admin.reviewApproved, createDomainEvent("admin", EVENT_NAMES.admin.reviewApproved, {
      reviewId: "rev-1",
      mentorId: "mentor-1",
      sessionId: "sess-1",
      reviewerUserId: "user-1",
      approvedAt: "2026-03-21T00:00:00Z",
    }));

    expect(result.matchedRules.length).toBeGreaterThan(0);
    expect(result.emittedIntents.some(i => i.intent === EVENT_NAMES.intents.mentorReputationRefreshRequested)).toBe(true);
  });

  it("dispatches admin.review_rejected and produces mentor reputation intent", async () => {
    const result = await dispatch(EVENT_NAMES.admin.reviewRejected, createDomainEvent("admin", EVENT_NAMES.admin.reviewRejected, {
      reviewId: "rev-2",
      mentorId: "mentor-2",
      sessionId: "sess-2",
      reviewerUserId: "user-1",
      rejectedAt: "2026-03-21T00:00:00Z",
    }));

    expect(result.matchedRules.length).toBeGreaterThan(0);
    expect(result.emittedIntents.some(i => i.intent === EVENT_NAMES.intents.mentorReputationRefreshRequested)).toBe(true);
  });

  it("dispatches admin.content_approved and produces workforce refresh intent", async () => {
    const result = await dispatch(EVENT_NAMES.admin.contentApproved, createDomainEvent("admin", EVENT_NAMES.admin.contentApproved, {
      itemId: "item-1",
      providerId: "prov-1",
      approvedBy: "admin-1",
      approvedAt: "2026-03-21T00:00:00Z",
    }));

    expect(result.matchedRules.length).toBeGreaterThan(0);
    expect(result.emittedIntents.some(i => i.intent === EVENT_NAMES.intents.workforceRefreshRequested)).toBe(true);
  });

  it("does not produce intents for admin.content_rejected (no rule defined)", async () => {
    const result = await dispatch(EVENT_NAMES.admin.contentRejected, createDomainEvent("admin", EVENT_NAMES.admin.contentRejected, {
      itemId: "item-1",
      providerId: "prov-1",
      rejectedBy: "admin-1",
      rejectedAt: "2026-03-21T00:00:00Z",
    }));

    // No rule for content_rejected → no intents
    expect(result.emittedIntents).toHaveLength(0);
  });
});

// ── Existing Trust Rules Still Work ────────────────────────────

describe("Existing Trust Rules — No Regression", () => {
  it("trust.verification_completed[approved] produces verified_state + workforce intents (decision-aware)", async () => {
    const result = await dispatch(EVENT_NAMES.trust.verificationCompleted, createDomainEvent("trust", EVENT_NAMES.trust.verificationCompleted, {
      teacherId: "t1",
      verificationType: "teacher_identity",
      status: "approved" as const,
      completedAt: "2026-03-21T00:00:00Z",
    }));

    const intentNames = result.emittedIntents.map(i => i.intent);
    // Always: verified state refresh
    expect(intentNames).toContain(EVENT_NAMES.intents.verifiedStateRefreshRequested);
    // Workforce cascade from workforce-on-verification-completed rule
    expect(intentNames).toContain(EVENT_NAMES.intents.workforceRefreshRequested);
    // Note: CRI, gaps, talent are conditional on existing state (decision-aware)
  });

  it("trust.credential_issued still produces cri + reputation intents", async () => {
    const result = await dispatch(EVENT_NAMES.trust.credentialIssued, createDomainEvent("trust", EVENT_NAMES.trust.credentialIssued, {
      teacherId: "t1",
      credentialId: "cred-1",
      sourceType: "training" as const,
      evidenceType: "badge",
      issuedAt: "2026-03-21T00:00:00Z",
    }));

    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.criRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.reputationRefreshRequested);
  });
});
