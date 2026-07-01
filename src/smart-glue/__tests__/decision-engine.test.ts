/**
 * Decision Engine Tests — Sprint 10 + Sprint 11
 *
 * Validates all decision functions in isolation.
 * No DB, no handlers, pure function tests.
 */

import { describe, it, expect } from "vitest";
import {
  resolveRejectionDecision,
  resolveProfileUpdateDecision,
  resolveTrainingCompletionDecision,
  resolveEvidenceApprovalDecision,
} from "../decision-engine";
import type { RejectionIntelligenceContext } from "../intelligence/rejection-context.reader";
import type { ProfileUpdateDecisionContext } from "../intelligence/profile-update-context.reader";
import type { TrainingCompletionDecisionContext } from "../intelligence/training-completion-context.reader";
import type { EvidenceApprovalDecisionContext } from "../intelligence/evidence-approval-context.reader";

// ── Helpers ─────────────────────────────────────────────────────

function makeRejectionContext(overrides: Partial<{
  totalGaps: number;
  hasRecs: boolean;
  recCount: number;
  criScore: number | null;
  topGapCategory: string;
}>): RejectionIntelligenceContext {
  const g = overrides.totalGaps ?? 0;
  return {
    hasIntelligence: true,
    gaps: {
      available: g > 0,
      totalGaps: g,
      topGaps: g > 0
        ? [{ termId: "term-1", category: (overrides.topGapCategory ?? "certification") as any, source: "job_requirement", severity: "medium" as const }]
        : [],
      categories: g > 0 ? [overrides.topGapCategory ?? "certification"] : [],
    },
    recommendations: {
      available: overrides.hasRecs ?? false,
      totalCount: overrides.recCount ?? 0,
      hasExistingRecommendations: overrides.hasRecs ?? false,
    },
    cri: {
      available: overrides.criScore !== undefined,
      score: overrides.criScore ?? null,
      gapTermIds: [],
    },
  };
}

// ══════════════════════════════════════════════════════════════
// 1. REJECTION DECISION (Sprint 10)
// ══════════════════════════════════════════════════════════════

describe("Decision Engine — resolveRejectionDecision", () => {
  it("generates recommendations when none exist", () => {
    const decision = resolveRejectionDecision(makeRejectionContext({ totalGaps: 1, hasRecs: false }), "test-trace");
    expect(decision.shouldGenerateRecommendations).toBe(true);
    expect(decision.hasRecommendations).toBe(false);
  });

  it("skips recommendations when they already exist", () => {
    const decision = resolveRejectionDecision(makeRejectionContext({ totalGaps: 1, hasRecs: true, recCount: 3 }), "test-trace");
    expect(decision.shouldGenerateRecommendations).toBe(false);
    expect(decision.hasRecommendations).toBe(true);
  });

  it("selects topGap from available gaps", () => {
    const decision = resolveRejectionDecision(makeRejectionContext({ totalGaps: 2, topGapCategory: "subject" }), "test-trace");
    expect(decision.topGap).not.toBeNull();
    expect(decision.topGap!.category).toBe("subject");
  });

  it("topGap is null when no gaps exist", () => {
    const decision = resolveRejectionDecision(makeRejectionContext({ totalGaps: 0 }), "test-trace");
    expect(decision.topGap).toBeNull();
  });

  it("triggers CRI refresh when gaps ≥ 3", () => {
    const decision = resolveRejectionDecision(makeRejectionContext({ totalGaps: 4 }), "test-trace");
    expect(decision.shouldRefreshCri).toBe(true);
  });

  it("skips CRI refresh when gaps < 3", () => {
    const decision = resolveRejectionDecision(makeRejectionContext({ totalGaps: 2 }), "test-trace");
    expect(decision.shouldRefreshCri).toBe(false);
  });

  it("handles undefined context gracefully", () => {
    const decision = resolveRejectionDecision(undefined, "test-trace");
    expect(decision.topGap).toBeNull();
    expect(decision.shouldGenerateRecommendations).toBe(true);
    expect(decision.shouldRefreshCri).toBe(false);
    expect(decision.maxIntents).toBe(4);
  });

  it("includes reasoning trace", () => {
    const decision = resolveRejectionDecision(makeRejectionContext({ totalGaps: 1, hasRecs: false }), "test-trace");
    expect(decision.reasoning.length).toBeGreaterThan(0);
    expect(decision.reasoning.some(r => r.includes("recommendations: generate"))).toBe(true);
  });

  it("Case 3: multiple gaps → only ONE topGap selected", () => {
    const ctx = makeRejectionContext({ totalGaps: 5, topGapCategory: "certification" });
    ctx.gaps.topGaps.push(
      { termId: "term-2", category: "subject", source: "job_requirement", severity: "medium" as const },
      { termId: "term-3", category: "skill", source: "job_requirement", severity: "medium" as const },
    );
    const decision = resolveRejectionDecision(ctx, "test-trace");
    expect(decision.topGap).toEqual({ termId: "term-1", category: "certification", source: "job_requirement", severity: "medium" as const });
  });
});

// ══════════════════════════════════════════════════════════════
// 2. PROFILE UPDATE DECISION (Sprint 11)
// ══════════════════════════════════════════════════════════════

describe("Decision Engine — resolveProfileUpdateDecision", () => {
  it("skips recomputation on cosmetic changes (bio, avatar)", () => {
    const ctx: ProfileUpdateDecisionContext = {
      hasMeaningfulChange: false,
      meaningfulFields: [],
      cosmeticFields: ["bio", "avatar_url"],
      hasExistingRecommendations: false,
      recommendationCount: 0,
    };
    const decision = resolveProfileUpdateDecision(ctx, "test-trace");
    expect(decision.shouldRecompute).toBe(false);
    expect(decision.maxIntents).toBe(0);
    expect(decision.priority).toBe("low");
  });

  it("triggers recomputation on subject changes (high impact)", () => {
    const ctx: ProfileUpdateDecisionContext = {
      hasMeaningfulChange: true,
      meaningfulFields: ["subject_term_ids"],
      cosmeticFields: [],
      hasExistingRecommendations: false,
      recommendationCount: 0,
    };
    const decision = resolveProfileUpdateDecision(ctx, "test-trace");
    expect(decision.shouldRecompute).toBe(true);
    expect(decision.shouldRefreshCri).toBe(true);
    expect(decision.shouldRefreshMatch).toBe(true);
    expect(decision.shouldRefreshGaps).toBe(true);
    expect(decision.priority).toBe("high");
  });

  it("triggers limited recomputation on experience changes (normal impact)", () => {
    const ctx: ProfileUpdateDecisionContext = {
      hasMeaningfulChange: true,
      meaningfulFields: ["experience_years"],
      cosmeticFields: [],
      hasExistingRecommendations: false,
      recommendationCount: 0,
    };
    const decision = resolveProfileUpdateDecision(ctx, "test-trace");
    expect(decision.shouldRecompute).toBe(true);
    expect(decision.shouldRefreshCri).toBe(true);
    expect(decision.shouldRefreshMatch).toBe(true);
    expect(decision.shouldRefreshGaps).toBe(false); // Not high-impact
    expect(decision.priority).toBe("normal");
  });

  it("handles undefined context gracefully", () => {
    const decision = resolveProfileUpdateDecision(undefined, "test-trace");
    expect(decision.shouldRecompute).toBe(false);
    expect(decision.maxIntents).toBe(0);
  });

  it("enforces maxIntents budget", () => {
    const ctx: ProfileUpdateDecisionContext = {
      hasMeaningfulChange: true,
      meaningfulFields: ["subject_term_ids"],
      cosmeticFields: [],
      hasExistingRecommendations: false,
      recommendationCount: 0,
    };
    const decision = resolveProfileUpdateDecision(ctx, "test-trace");
    expect(decision.maxIntents).toBe(3);
  });

  it("includes reasoning trace", () => {
    const ctx: ProfileUpdateDecisionContext = {
      hasMeaningfulChange: true,
      meaningfulFields: ["skills", "certifications"],
      cosmeticFields: ["bio"],
      hasExistingRecommendations: false,
      recommendationCount: 0,
    };
    const decision = resolveProfileUpdateDecision(ctx, "test-trace");
    expect(decision.reasoning.some(r => r.includes("meaningful_fields"))).toBe(true);
    expect(decision.reasoning.some(r => r.includes("cosmetic_fields_ignored"))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. TRAINING COMPLETION DECISION (Sprint 11)
// ══════════════════════════════════════════════════════════════

describe("Decision Engine — resolveTrainingCompletionDecision", () => {
  it("Case 1: gap closed → high priority + CRI refresh + recommendations", () => {
    const ctx: TrainingCompletionDecisionContext = {
      hasGapData: true,
      totalGaps: 3,
      closedGaps: [{ termId: "skill-1", category: "skill", source: "job_requirement", severity: "medium" as const }],
      closesGap: true,
      hasExistingRecommendations: false,
      recommendationCount: 0,
    };
    const decision = resolveTrainingCompletionDecision(ctx, "test-trace");
    expect(decision.priority).toBe("high");
    expect(decision.closesGap).toBe(true);
    expect(decision.shouldRefreshCri).toBe(true);
    expect(decision.shouldGenerateRecommendations).toBe(true);
  });

  it("Case 2: already covered → normal priority, skip recommendations", () => {
    const ctx: TrainingCompletionDecisionContext = {
      hasGapData: true,
      totalGaps: 2,
      closedGaps: [],
      closesGap: false,
      hasExistingRecommendations: true,
      recommendationCount: 5,
    };
    const decision = resolveTrainingCompletionDecision(ctx, "test-trace");
    expect(decision.priority).toBe("normal");
    expect(decision.closesGap).toBe(false);
    expect(decision.shouldGenerateRecommendations).toBe(false);
  });

  it("handles undefined context gracefully (default behavior)", () => {
    const decision = resolveTrainingCompletionDecision(undefined, "test-trace");
    expect(decision.shouldRefreshCri).toBe(true);
    expect(decision.shouldGenerateRecommendations).toBe(true);
    expect(decision.priority).toBe("normal");
  });

  it("enforces maxIntents budget", () => {
    const decision = resolveTrainingCompletionDecision(undefined, "test-trace");
    expect(decision.maxIntents).toBe(4);
  });

  it("includes gap details in reasoning when gap is closed", () => {
    const ctx: TrainingCompletionDecisionContext = {
      hasGapData: true,
      totalGaps: 1,
      closedGaps: [{ termId: "cert-1", category: "certification", source: "job_requirement", severity: "medium" as const }],
      closesGap: true,
      hasExistingRecommendations: false,
      recommendationCount: 0,
    };
    const decision = resolveTrainingCompletionDecision(ctx, "test-trace");
    expect(decision.reasoning.some(r => r.includes("gap_closed"))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. EVIDENCE APPROVAL DECISION (Sprint 11)
// ══════════════════════════════════════════════════════════════

describe("Decision Engine — resolveEvidenceApprovalDecision", () => {
  it("Case 1: meaningful evidence → full response", () => {
    const ctx: EvidenceApprovalDecisionContext = {
      hasExistingRecommendations: false,
      recommendationCount: 0,
      hasVerifiedState: true,
      verifiedCount: 1,
      totalCredentials: 2,
      hasRedundantEvidence: false,
    };
    const decision = resolveEvidenceApprovalDecision(ctx, "test-trace");
    expect(decision.isRedundant).toBe(false);
    expect(decision.shouldRefreshTrust).toBe(true);
    expect(decision.shouldRefreshTalent).toBe(true);
    expect(decision.shouldGenerateRecommendations).toBe(true);
    expect(decision.shouldRefreshMentorReputation).toBe(true);
    expect(decision.priority).toBe("high"); // verifiedCount < 3
  });

  it("Case 2: redundant evidence → minimal response", () => {
    const ctx: EvidenceApprovalDecisionContext = {
      hasExistingRecommendations: true,
      recommendationCount: 4,
      hasVerifiedState: true,
      verifiedCount: 6,
      totalCredentials: 8,
      hasRedundantEvidence: true,
    };
    const decision = resolveEvidenceApprovalDecision(ctx, "test-trace");
    expect(decision.isRedundant).toBe(true);
    expect(decision.shouldRefreshTrust).toBe(false);
    expect(decision.shouldRefreshTalent).toBe(false);
    expect(decision.shouldGenerateRecommendations).toBe(false);
    expect(decision.shouldRefreshMentorReputation).toBe(true);
    expect(decision.priority).toBe("low");
    expect(decision.maxIntents).toBe(1);
  });

  it("skips recommendation generation when existing recommendations exist", () => {
    const ctx: EvidenceApprovalDecisionContext = {
      hasExistingRecommendations: true,
      recommendationCount: 3,
      hasVerifiedState: true,
      verifiedCount: 2,
      totalCredentials: 3,
      hasRedundantEvidence: false,
    };
    const decision = resolveEvidenceApprovalDecision(ctx, "test-trace");
    expect(decision.shouldGenerateRecommendations).toBe(false);
  });

  it("handles undefined context gracefully (full response)", () => {
    const decision = resolveEvidenceApprovalDecision(undefined, "test-trace");
    expect(decision.isRedundant).toBe(false);
    expect(decision.shouldRefreshTrust).toBe(true);
    expect(decision.shouldRefreshTalent).toBe(true);
    expect(decision.shouldGenerateRecommendations).toBe(true);
    expect(decision.shouldRefreshMentorReputation).toBe(true);
  });

  it("high priority when teacher has few verified credentials", () => {
    const ctx: EvidenceApprovalDecisionContext = {
      hasExistingRecommendations: false,
      recommendationCount: 0,
      hasVerifiedState: true,
      verifiedCount: 0,
      totalCredentials: 1,
      hasRedundantEvidence: false,
    };
    const decision = resolveEvidenceApprovalDecision(ctx, "test-trace");
    expect(decision.priority).toBe("high");
  });

  it("normal priority when teacher already has many verified credentials", () => {
    const ctx: EvidenceApprovalDecisionContext = {
      hasExistingRecommendations: false,
      recommendationCount: 0,
      hasVerifiedState: true,
      verifiedCount: 4,
      totalCredentials: 5,
      hasRedundantEvidence: false,
    };
    const decision = resolveEvidenceApprovalDecision(ctx, "test-trace");
    expect(decision.priority).toBe("normal");
  });

  it("includes reasoning trace", () => {
    const ctx: EvidenceApprovalDecisionContext = {
      hasExistingRecommendations: true,
      recommendationCount: 2,
      hasVerifiedState: false,
      verifiedCount: 0,
      totalCredentials: 0,
      hasRedundantEvidence: false,
    };
    const decision = resolveEvidenceApprovalDecision(ctx, "test-trace");
    expect(decision.reasoning.some(r => r.includes("recommendations: skip"))).toBe(true);
  });
});
