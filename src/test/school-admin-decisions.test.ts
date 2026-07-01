/**
 * Tests — School/Admin Decision Usage (Sprint 13 PART 3)
 *
 * Verifies all three school/admin decision scenarios:
 *   1. Job Published — match refresh scope, verified prioritization, suppression
 *   2. Verification Completed — trust, visibility boost, beginner suppression
 *   3. Team Capability — material change gating, cooldown throttling
 */

import { describe, it, expect } from "vitest";
import {
  resolveJobPublishDecision,
  resolveVerificationDecision,
  resolveTeamCapabilityDecision,
  type TeamCapabilityContext,
} from "@/smart-glue/decision-engine-school";
import type { JobPublishDecisionContext } from "@/smart-glue/intelligence/job-publish-context.reader";
import type { VerificationDecisionContext } from "@/smart-glue/intelligence/verification-context.reader";

// ══════════════════════════════════════════════════════════════
// 1. JOB PUBLISHED DECISION
// ══════════════════════════════════════════════════════════════

describe("resolveJobPublishDecision", () => {
  it("returns full refresh when no context", () => {
    const d = resolveJobPublishDecision(undefined);
    expect(d.matchRefreshScope).toBe("full");
    expect(d.shouldRefreshWorkforce).toBe(true);
    expect(d.priority).toBe("normal");
  });

  it("limits match refresh when existing snapshots found", () => {
    const ctx: JobPublishDecisionContext = {
      jobId: "j1",
      existingApplicantCount: 5,
      highReadinessCandidateCount: 10,
      verifiedCandidateCount: 8,
      hasSubjectTerms: true,
      hasRecentMatches: true,
    };
    const d = resolveJobPublishDecision(ctx);
    expect(d.matchRefreshScope).toBe("limited");
    expect(d.reasoning.some(r => r.includes("limited"))).toBe(true);
  });

  it("prioritizes verified when sufficient pool exists", () => {
    const ctx: JobPublishDecisionContext = {
      jobId: "j1",
      existingApplicantCount: 3,
      highReadinessCandidateCount: 5,
      verifiedCandidateCount: 8,
      hasSubjectTerms: true,
      hasRecentMatches: false,
    };
    const d = resolveJobPublishDecision(ctx);
    expect(d.prioritizeVerified).toBe(true);
  });

  it("does not prioritize verified with small pool", () => {
    const ctx: JobPublishDecisionContext = {
      jobId: "j1",
      existingApplicantCount: 0,
      highReadinessCandidateCount: 1,
      verifiedCandidateCount: 2,
      hasSubjectTerms: true,
      hasRecentMatches: false,
    };
    const d = resolveJobPublishDecision(ctx);
    expect(d.prioritizeVerified).toBe(false);
  });

  it("suppresses low-value refreshes for untargeted jobs", () => {
    const ctx: JobPublishDecisionContext = {
      jobId: "j1",
      existingApplicantCount: 0,
      highReadinessCandidateCount: 0,
      verifiedCandidateCount: 0,
      hasSubjectTerms: false,
      hasRecentMatches: false,
    };
    const d = resolveJobPublishDecision(ctx);
    expect(d.suppressLowValueRefreshes).toBe(true);
  });

  it("sets high priority for school with no applicants", () => {
    const ctx: JobPublishDecisionContext = {
      jobId: "j1",
      existingApplicantCount: 0,
      highReadinessCandidateCount: 5,
      verifiedCandidateCount: 3,
      hasSubjectTerms: true,
      hasRecentMatches: false,
    };
    const d = resolveJobPublishDecision(ctx);
    expect(d.priority).toBe("high");
  });
});

// ══════════════════════════════════════════════════════════════
// 2. VERIFICATION COMPLETED DECISION
// ══════════════════════════════════════════════════════════════

describe("resolveVerificationDecision", () => {
  it("returns full response when no context", () => {
    const d = resolveVerificationDecision(undefined);
    expect(d.shouldRefreshTrust).toBe(true);
    expect(d.shouldBoostVisibility).toBe(true);
    expect(d.shouldRefreshCri).toBe(true);
    expect(d.shouldRefreshGaps).toBe(true);
  });

  it("boosts visibility for high-readiness teacher", () => {
    const ctx: VerificationDecisionContext = {
      teacherId: "t1",
      criScore: 60,
      readinessLevel: "highly_ready",
      hasExistingRecommendations: true,
      recommendationCount: 3,
      currentVerifiedStatus: "partial",
      verifiedCount: 3,
      totalCredentials: 4,
      hasUnresolvedGaps: false,
      unresolvedGapCount: 0,
      growthMomentum: "active",
    };
    const d = resolveVerificationDecision(ctx);
    expect(d.shouldBoostVisibility).toBe(true);
  });

  it("suppresses beginner guidance for verified high-readiness teacher", () => {
    const ctx: VerificationDecisionContext = {
      teacherId: "t1",
      criScore: 70,
      readinessLevel: "ready",
      hasExistingRecommendations: true,
      recommendationCount: 5,
      currentVerifiedStatus: "partial",
      verifiedCount: 3,
      totalCredentials: 4,
      hasUnresolvedGaps: false,
      unresolvedGapCount: 0,
      growthMomentum: "active",
    };
    const d = resolveVerificationDecision(ctx);
    expect(d.suppressBeginnerGuidance).toBe(true);
  });

  it("does not suppress beginner guidance for low-readiness teacher", () => {
    const ctx: VerificationDecisionContext = {
      teacherId: "t1",
      criScore: 25,
      readinessLevel: "early",
      hasExistingRecommendations: false,
      recommendationCount: 0,
      currentVerifiedStatus: "none",
      verifiedCount: 0,
      totalCredentials: 2,
      hasUnresolvedGaps: true,
      unresolvedGapCount: 5,
      growthMomentum: "inactive",
    };
    const d = resolveVerificationDecision(ctx);
    expect(d.suppressBeginnerGuidance).toBe(false);
    expect(d.shouldRefreshGaps).toBe(true);
  });

  it("skips gap refresh when no unresolved gaps", () => {
    const ctx: VerificationDecisionContext = {
      teacherId: "t1",
      criScore: 45,
      readinessLevel: "developing",
      hasExistingRecommendations: true,
      recommendationCount: 2,
      currentVerifiedStatus: "partial",
      verifiedCount: 1,
      totalCredentials: 3,
      hasUnresolvedGaps: false,
      unresolvedGapCount: 0,
      growthMomentum: "active",
    };
    const d = resolveVerificationDecision(ctx);
    expect(d.shouldRefreshGaps).toBe(false);
  });

  it("sets high priority when teacher will become fully verified", () => {
    const ctx: VerificationDecisionContext = {
      teacherId: "t1",
      criScore: 50,
      readinessLevel: "developing",
      hasExistingRecommendations: false,
      recommendationCount: 0,
      currentVerifiedStatus: "partial",
      verifiedCount: 2,
      totalCredentials: 3,
      hasUnresolvedGaps: true,
      unresolvedGapCount: 2,
      growthMomentum: "active",
    };
    const d = resolveVerificationDecision(ctx);
    expect(d.priority).toBe("high");
  });
});

// ══════════════════════════════════════════════════════════════
// 3. TEAM CAPABILITY DECISION
// ══════════════════════════════════════════════════════════════

describe("resolveTeamCapabilityDecision", () => {
  it("returns default refresh when no context", () => {
    const d = resolveTeamCapabilityDecision(undefined);
    expect(d.shouldRefreshTeam).toBe(true);
    expect(d.shouldRefreshDepartments).toBe(true);
  });

  it("skips all refreshes when no material change", () => {
    const ctx: TeamCapabilityContext = {
      schoolId: "s1",
      teacherCount: 20,
      hasDepartmentSnapshots: true,
      lastRefreshAt: null,
      hasMaterialChange: false,
    };
    const d = resolveTeamCapabilityDecision(ctx);
    expect(d.shouldRefreshTeam).toBe(false);
    expect(d.shouldRefreshDepartments).toBe(false);
    expect(d.priority).toBe("low");
  });

  it("throttles refresh within cooldown window", () => {
    const recentRefresh = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const ctx: TeamCapabilityContext = {
      schoolId: "s1",
      teacherCount: 15,
      hasDepartmentSnapshots: true,
      lastRefreshAt: recentRefresh,
      hasMaterialChange: true,
    };
    const d = resolveTeamCapabilityDecision(ctx);
    expect(d.shouldRefreshTeam).toBe(false);
    expect(d.reasoning.some(r => r.includes("throttled"))).toBe(true);
  });

  it("refreshes team but skips departments when no snapshots exist", () => {
    const ctx: TeamCapabilityContext = {
      schoolId: "s1",
      teacherCount: 10,
      hasDepartmentSnapshots: false,
      lastRefreshAt: null,
      hasMaterialChange: true,
    };
    const d = resolveTeamCapabilityDecision(ctx);
    expect(d.shouldRefreshTeam).toBe(true);
    expect(d.shouldRefreshDepartments).toBe(false);
  });

  it("fully refreshes when material change and past cooldown", () => {
    const oldRefresh = new Date(Date.now() - 600_000).toISOString(); // 10 min ago
    const ctx: TeamCapabilityContext = {
      schoolId: "s1",
      teacherCount: 25,
      hasDepartmentSnapshots: true,
      lastRefreshAt: oldRefresh,
      hasMaterialChange: true,
    };
    const d = resolveTeamCapabilityDecision(ctx);
    expect(d.shouldRefreshTeam).toBe(true);
    expect(d.shouldRefreshDepartments).toBe(true);
    expect(d.priority).toBe("normal");
  });
});
