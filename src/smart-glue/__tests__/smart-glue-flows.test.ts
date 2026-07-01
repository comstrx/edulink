/**
 * Smart Glue Flow Tests — Sprint 9.5-C
 *
 * Validates that events produce correct intents through the rules layer.
 * Tests rule routing, not handler execution.
 *
 * Context readers are mocked to avoid Supabase calls in tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { dispatch } from "../dispatcher";
import { createDomainEvent } from "@/contracts/core/domain-event";
import { EVENT_NAMES } from "@/contracts/core/event-names";

// Mock all context readers that hit Supabase
vi.mock("@/smart-glue/intelligence/profile-update-context.reader", () => ({
  readProfileUpdateContext: vi.fn(async (_teacherId: string, updatedFields: string[]) => {
    const MEANINGFUL = new Set(["subject_term_ids", "certification_term_ids", "skill_term_ids"]);
    const meaningfulFields = updatedFields.filter((f) => MEANINGFUL.has(f));
    const cosmeticFields = updatedFields.filter((f) => !MEANINGFUL.has(f));
    return {
      hasMeaningfulChange: meaningfulFields.length > 0,
      meaningfulFields,
      cosmeticFields,
      hasExistingRecommendations: false,
      recommendationCount: 0,
    };
  }),
}));

vi.mock("@/smart-glue/intelligence/rejection-context.reader", () => ({
  readRejectionContext: vi.fn(async () => ({
    hasIntelligence: false,
    gaps: { available: false, totalGaps: 0, topGaps: [], categories: [] },
    recommendations: { available: false, totalCount: 0, hasExistingRecommendations: false },
    cri: { available: false, score: null, gapTermIds: [] },
  })),
}));

vi.mock("@/smart-glue/intelligence/cross-domain-context.reader", () => ({
  resolveCrossDomainContext: vi.fn(async () => undefined),
}));

vi.mock("@/smart-glue/intelligence/training-completion-context.reader", () => ({
  readTrainingCompletionContext: vi.fn(async () => ({
    closedGaps: [],
    totalGaps: 0,
    hasExistingRecommendations: false,
    recommendationCount: 0,
  })),
}));

vi.mock("@/smart-glue/intelligence/evidence-approval-context.reader", () => ({
  readEvidenceApprovalContext: vi.fn(async () => ({
    hasRedundantEvidence: false,
    verifiedCount: 1,
    totalCredentials: 3,
    hasExistingRecommendations: false,
    recommendationCount: 0,
  })),
}));

vi.mock("@/smart-glue/intelligence/recommendation-context.reader", () => ({
  readRecommendationContext: vi.fn(async () => ({
    hasExistingRecommendations: false,
    recommendationCount: 0,
  })),
}));

vi.mock("@/smart-glue/intelligence/job-publish-context.reader", () => ({
  readJobPublishContext: vi.fn(async () => ({
    hasSubjectTerms: true,
    applicantCount: 0,
    schoolVerifiedCount: 0,
  })),
}));

vi.mock("@/intelligence/outcomes/outcome-signal.service", () => ({
  resolveTeacherFeedback: vi.fn(async () => null),
  detectRecommendationOutcome: vi.fn(async () => null),
  detectGapClosureOutcome: vi.fn(() => null),
  detectTrustImprovementOutcome: vi.fn(async () => null),
}));

vi.mock("@/intelligence/provider/provider-attribution.service", () => ({
  resolveProviderAttribution: vi.fn(async () => ({ providerId: null })),
}));

vi.mock("@/intelligence/provider/provider-signals.service", () => ({
  getProviderPerformanceSummary: vi.fn(async () => null),
  invalidateProviderSummary: vi.fn(),
}));

// Silence console during tests
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("Smart Glue — Event Flow Tests", () => {
  // ── Identity ──

  it("profile_updated (teacher, meaningful) → CRI + match + gap refresh", async () => {
    const event = createDomainEvent("identity", EVENT_NAMES.identity.profileUpdated, {
      userId: "teacher-1",
      profileId: "profile-1",
      profileType: "teacher" as const,
      updatedFields: ["subject_term_ids"],
    });

    const result = await dispatch(EVENT_NAMES.identity.profileUpdated, event);

    expect(result.matchedRules.length).toBeGreaterThanOrEqual(1);
    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.criRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.matchRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
  });

  it("profile_updated (teacher, cosmetic) → no CRI/match/gap intents, career may still fire", async () => {
    const event = createDomainEvent("identity", EVENT_NAMES.identity.profileUpdated, {
      userId: "teacher-1",
      profileId: "profile-1",
      profileType: "teacher" as const,
      updatedFields: ["bio"],
    });

    const result = await dispatch(EVENT_NAMES.identity.profileUpdated, event);

    expect(result.matchedRules.length).toBeGreaterThanOrEqual(1);
    const intentNames = result.emittedIntents.map(i => i.intent);
    // Decision Engine should NOT emit CRI/match/gap for cosmetic changes
    expect(intentNames).not.toContain(EVENT_NAMES.intents.criRefreshRequested);
    expect(intentNames).not.toContain(EVENT_NAMES.intents.matchRefreshRequested);
    expect(intentNames).not.toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
  });

  it("profile_updated (non-teacher) → identity rule skipped, other rules may still fire", async () => {
    const event = createDomainEvent("identity", EVENT_NAMES.identity.profileUpdated, {
      userId: "school-1",
      profileId: "profile-1",
      profileType: "school" as const,
      updatedFields: ["name"],
    });

    const result = await dispatch(EVENT_NAMES.identity.profileUpdated, event);

    expect(result.skippedRules.length).toBeGreaterThanOrEqual(1);
    // Identity CRI+match+gap rule should be skipped
    expect(result.skippedRules).toContain("identity.profile_updated→decision_engine");
  });

  // ── Trust ──

  it("verification_completed (approved) → verified state + workforce (decision-aware)", async () => {
    const event = createDomainEvent("trust", EVENT_NAMES.trust.verificationCompleted, {
      teacherId: "teacher-1",
      verificationType: "teacher_identity",
      status: "approved" as const,
      completedAt: new Date().toISOString(),
    });

    const result = await dispatch(EVENT_NAMES.trust.verificationCompleted, event);

    const intentNames = result.emittedIntents.map(i => i.intent);
    // Always emitted by decision engine
    expect(intentNames).toContain(EVENT_NAMES.intents.verifiedStateRefreshRequested);
    // Workforce cascade from workforce-on-verification-completed rule
    expect(intentNames).toContain(EVENT_NAMES.intents.workforceRefreshRequested);
  });

  it("verification_completed (rejected) → gap refresh only", async () => {
    const event = createDomainEvent("trust", EVENT_NAMES.trust.verificationCompleted, {
      teacherId: "teacher-1",
      verificationType: "teacher_identity",
      status: "rejected" as const,
      completedAt: new Date().toISOString(),
    });

    const result = await dispatch(EVENT_NAMES.trust.verificationCompleted, event);

    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
    expect(intentNames).not.toContain(EVENT_NAMES.intents.verifiedStateRefreshRequested);
  });

  // ── Hiring ──

  it("job_applied → CRI + gap + match + reputation", async () => {
    const event = createDomainEvent("hiring", EVENT_NAMES.hiring.jobApplied, {
      applicationId: "app-1",
      teacherId: "teacher-1",
      jobId: "job-1",
      appliedAt: new Date().toISOString(),
    });

    const result = await dispatch(EVENT_NAMES.hiring.jobApplied, event);

    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.criRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.matchRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.reputationRefreshRequested);
  });

  it("job_published → match + workforce refresh (decision-aware)", async () => {
    const event = createDomainEvent("hiring", EVENT_NAMES.hiring.jobPublished, {
      jobId: "job-1",
      schoolId: "school-1",
      title: "Math Teacher",
    });

    const result = await dispatch(EVENT_NAMES.hiring.jobPublished, event);

    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.matchRefreshRequested);
    // Sprint 13: decision-aware rule also triggers workforce + gap refresh
    expect(intentNames).toContain(EVENT_NAMES.intents.workforceRefreshRequested);
  });

  it("application_rejected → gap refresh always + conditional recommendations", async () => {
    const event = createDomainEvent("hiring", EVENT_NAMES.hiring.applicationRejected, {
      applicationId: "app-1",
      teacherId: "teacher-1",
      jobId: "job-1",
      rejectionReasonTermId: "term-1",
      rejectedAt: new Date().toISOString(),
    });

    const result = await dispatch(EVENT_NAMES.hiring.applicationRejected, event);

    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
    // With mocked empty context, hasRecommendations = false → should generate
    expect(intentNames).toContain(EVENT_NAMES.intents.trainingRecommendationRequested);
  });

  // ── Training ──

  it("training.completed → CRI + gap + recommendation + reputation", async () => {
    const event = createDomainEvent("training", EVENT_NAMES.training.completed, {
      teacherId: "teacher-1",
      courseId: "course-1",
      skillIds: ["skill-1", "skill-2"],
      evidenceType: "certificate" as const,
      completedAt: new Date().toISOString(),
    });

    const result = await dispatch(EVENT_NAMES.training.completed, event);

    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.criRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.trainingRecommendationRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.reputationRefreshRequested);

    // Verify skillIds are forwarded in recommendation payload
    const recIntent = result.emittedIntents.find(
      i => i.intent === EVENT_NAMES.intents.trainingRecommendationRequested
    );
    expect(recIntent?.payload.skillIds).toEqual(["skill-1", "skill-2"]);
  });

  // ── Mentorship ──

  it("mentorship.session_completed → growth recommendation", async () => {
    const event = createDomainEvent("training", EVENT_NAMES.mentorship.sessionCompleted, {
      sessionId: "session-1",
      mentorId: "mentor-1",
      teacherId: "teacher-1",
      durationMinutes: 45,
      sessionOutcome: "guidance_session",
    });

    const result = await dispatch(EVENT_NAMES.mentorship.sessionCompleted, event);

    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.growthRecommendationRefreshRequested);
  });

  it("mentorship.evidence_approved → CRI + talent + growth + trust + mentor reputation", async () => {
    const event = createDomainEvent("training", EVENT_NAMES.mentorship.evidenceApproved, {
      evidenceId: "ev-1",
      sessionId: "session-1",
      teacherId: "teacher-1",
      mentorId: "mentor-1",
      competencyTermIds: ["term-1"],
    });

    const result = await dispatch(EVENT_NAMES.mentorship.evidenceApproved, event);

    const intentNames = result.emittedIntents.map(i => i.intent);
    expect(intentNames).toContain(EVENT_NAMES.intents.criRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.talentProfileRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.growthRecommendationRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.teacherTrustRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.mentorReputationRefreshRequested);
  });

  it("mentorship.evidence_rejected → no intents (noop)", async () => {
    const event = createDomainEvent("training", EVENT_NAMES.mentorship.evidenceRejected, {
      evidenceId: "ev-1",
      sessionId: "session-1",
      teacherId: "teacher-1",
      mentorId: "mentor-1",
      reviewNotes: "Needs more detail",
    });

    const result = await dispatch(EVENT_NAMES.mentorship.evidenceRejected, event);
    expect(result.emittedIntents.length).toBe(0);
  });

  // ── Deduplication ──

  it("deduplicates identical intents across rules", async () => {
    const event = createDomainEvent("hiring", EVENT_NAMES.hiring.jobApplied, {
      applicationId: "app-1",
      teacherId: "teacher-1",
      jobId: "job-1",
      appliedAt: new Date().toISOString(),
    });

    const result = await dispatch(EVENT_NAMES.hiring.jobApplied, event);

    // All intents should be unique
    const keys = result.emittedIntents.map(i => `${i.intent}:${i.payload.teacherId ?? ""}:${i.payload.triggeredBy ?? ""}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  // ── Metadata enrichment ──

  it("intents carry source event metadata", async () => {
    const event = createDomainEvent("trust", EVENT_NAMES.trust.credentialIssued, {
      teacherId: "teacher-1",
      credentialId: "cred-1",
      sourceType: "training" as const,
      evidenceType: "completion",
      issuedAt: new Date().toISOString(),
    });

    const result = await dispatch(EVENT_NAMES.trust.credentialIssued, event);

    for (const intent of result.emittedIntents) {
      expect(intent.meta).toBeDefined();
      expect(intent.meta!.triggeredByEvent).toBe(EVENT_NAMES.trust.credentialIssued);
      expect(intent.meta!.sourceDomain).toBe("trust");
      expect(intent.meta!.triggeredAt).toBeDefined();
    }
  });
});
