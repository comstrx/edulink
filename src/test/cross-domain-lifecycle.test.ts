/**
 * Sprint 12 PART 6 — Cross-Domain Lifecycle Verification Tests
 *
 * End-to-end scenarios proving that the full pipeline
 * (local decision → cross-domain → safety) produces correct behavior
 * across multi-step teacher lifecycles.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveRejectionDecision,
  resolveTrainingCompletionDecision,
  resolveEvidenceApprovalDecision,
  resolveCrossDomainDecision,
} from "@/smart-glue/decision-engine";
import { applyDecisionSafety } from "@/smart-glue/decision-safety";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { IntentEmission } from "@/smart-glue/types";
import type { RejectionIntelligenceContext } from "@/smart-glue/intelligence/rejection-context.reader";
import type { TrainingCompletionDecisionContext } from "@/smart-glue/intelligence/training-completion-context.reader";
import type { EvidenceApprovalDecisionContext } from "@/smart-glue/intelligence/evidence-approval-context.reader";
import type { CrossDomainContext } from "@/smart-glue/intelligence/cross-domain-context.reader";
import type { GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// ── Helpers ───────────────────────────────────────────────────

function intent(name: string, teacherId = "t1"): IntentEmission {
  return { intent: name as any, payload: { teacherId, triggeredBy: "test" } };
}

function makeCrossCtx(overrides: Partial<{
  criScore: number | null; criBand: string;
  totalGaps: number; hasCriticalGaps: boolean; gapCategories: string[];
  recCount: number;
  trustStatus: string; verifiedCount: number; totalCredentials: number; verificationRatio: number;
  momentum: string; unresolvedGapCount: number; hiringAdvantageCount: number;
  activelyGrowing: boolean;
}> = {}): CrossDomainContext {
  const o = {
    criScore: 50, criBand: "moderate",
    totalGaps: 2, hasCriticalGaps: false, gapCategories: ["skill"],
    recCount: 0,
    trustStatus: "partial", verifiedCount: 1, totalCredentials: 3, verificationRatio: 0.33,
    momentum: "active", unresolvedGapCount: 2, hiringAdvantageCount: 0,
    activelyGrowing: true,
    ...overrides,
  };
  return {
    teacherId: "t1", available: true,
    cri: { available: true, score: o.criScore, band: o.criBand as any, gapTermIds: [], jobId: "j1" },
    gaps: {
      available: true, totalGaps: o.totalGaps,
      topGaps: [{ termId: "gap1", label: "TestGap", category: "skill" as any, source: "job_requirement" as any, severity: "medium" as const }],
      categories: o.gapCategories, hasCriticalGaps: o.hasCriticalGaps,
    },
    recommendations: { available: true, totalCount: o.recCount, hasExisting: o.recCount > 0, staleness: "fresh" },
    trust: { available: true, overallStatus: o.trustStatus as any, verifiedCount: o.verifiedCount, totalCount: o.totalCredentials, verificationRatio: o.verificationRatio },
    talent: {
      available: true, readinessLevel: "developing", growthMomentum: o.momentum,
      credentialStrength: "basic", unresolvedGapCount: o.unresolvedGapCount,
      hiringAdvantageCount: o.hiringAdvantageCount,
    },
    signals: {
      needsGuidance: true, hiringReady: false,
      activelyGrowing: o.activelyGrowing, hasCriAlignedGaps: false,
    },
  };
}

// ══════════════════════════════════════════════════════════════
// Case 1: rejection → training → re-apply → recommendations decrease
// ══════════════════════════════════════════════════════════════

describe("Case 1: Rejection → Training → Re-apply (recommendations decrease)", () => {
  it("Step 1: initial rejection generates full recommendations", () => {
    const rejCtx: RejectionIntelligenceContext = {
      hasIntelligence: true,
      gaps: {
        available: true, totalGaps: 4, categories: ["certification", "skill"],
        topGaps: [{ termId: "cert1", label: "PGCE", category: "certification", source: "job_requirement", severity: "medium" as const }],
      },
      recommendations: { available: true, hasExistingRecommendations: false, totalCount: 0 },
      cri: { available: false, score: null, gapTermIds: [] },
    };
    const decision = resolveRejectionDecision(rejCtx, "test-trace");

    expect(decision.shouldGenerateRecommendations).toBe(true);
    expect(decision.shouldRefreshCri).toBe(true); // 4 gaps ≥ 3 threshold
    expect(decision.topGap?.category).toBe("certification");
  });

  it("Step 2: after training, cross-domain detects improvement → caps recs", () => {
    // Teacher completed training, gaps went from 4 → 2
    const crossCtx = makeCrossCtx({
      totalGaps: 4,            // gap snapshot still shows original
      unresolvedGapCount: 2,   // talent shows fewer → improving
      activelyGrowing: true,
      momentum: "active",
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    expect(crossDecision.scenario).toBe("rejection_plus_training_improvement");
    expect(crossDecision.recommendationCap).toBe(3);
    expect(crossDecision.suppressBeginner).toBe(true);

    // Simulate intent list from a new rejection
    const intents = [
      intent(EVENT_NAMES.intents.skillGapRefreshRequested),
      intent(EVENT_NAMES.intents.trainingRecommendationRequested),
      intent(EVENT_NAMES.intents.growthRecommendationRefreshRequested),
      intent(EVENT_NAMES.intents.criRefreshRequested),
    ];

    const result = applyDecisionSafety({
      intents, crossDecision, maxIntents: 4,
      eventName: "case1_reapply", entityId: "t1", traceId: "test-trace",
    });

    // Rec count should be capped (at most 3 recs, and we had 2 rec intents)
    expect(result.intents.length).toBeLessThanOrEqual(4);
    // Both rec intents pass cap of 3, but safety enforces budget
    expect(result.intents.length).toBeGreaterThan(0);
  });

  it("Step 3: re-apply with existing recommendations → recs suppressed", () => {
    const rejCtx: RejectionIntelligenceContext = {
      hasIntelligence: true,
      gaps: {
        available: true, totalGaps: 2, categories: ["skill"],
        topGaps: [{ termId: "skill1", label: "React", category: "skill", source: "job_requirement", severity: "medium" as const }],
      },
      recommendations: { available: true, hasExistingRecommendations: true, totalCount: 5 },
      cri: { available: false, score: null, gapTermIds: [] },
    };
    const decision = resolveRejectionDecision(rejCtx, "test-trace");

    // Existing recs → skip generation
    expect(decision.shouldGenerateRecommendations).toBe(false);
    expect(decision.shouldRefreshCri).toBe(false); // 2 gaps < 3 threshold
  });
});

// ══════════════════════════════════════════════════════════════
// Case 2: mentorship evidence after rejection → readiness increases
// ══════════════════════════════════════════════════════════════

describe("Case 2: Mentorship evidence after rejection (readiness increases)", () => {
  it("evidence approval triggers trust + talent refresh", () => {
    const evidenceCtx: EvidenceApprovalDecisionContext = {
      hasRedundantEvidence: false,
      hasExistingRecommendations: false,
      recommendationCount: 0,
      hasVerifiedState: true,
      verifiedCount: 1,
      totalCredentials: 5,
    };
    const decision = resolveEvidenceApprovalDecision(evidenceCtx, "test-trace");

    expect(decision.isRedundant).toBe(false);
    expect(decision.shouldRefreshTrust).toBe(true);
    expect(decision.shouldRefreshTalent).toBe(true);
    expect(decision.shouldGenerateRecommendations).toBe(true);
    expect(decision.priority).toBe("high"); // verifiedCount < 3 → high
  });

  it("cross-domain detects verified evidence + growth → promotes advanced", () => {
    const crossCtx = makeCrossCtx({
      verifiedCount: 2, totalCredentials: 5, verificationRatio: 0.4,
      activelyGrowing: true, momentum: "emerging",
      totalGaps: 3, unresolvedGapCount: 3, // gaps not reducing → scenario 1 won't match
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    expect(crossDecision.scenario).toBe("rejection_plus_mentorship_evidence");
    expect(crossDecision.promoteAdvanced).toBe(true);
    expect(crossDecision.suppressBeginner).toBe(true);
  });

  it("full pipeline: evidence intents get advanced tags", () => {
    const crossCtx = makeCrossCtx({
      verifiedCount: 2, verificationRatio: 0.4,
      activelyGrowing: true, momentum: "emerging",
      totalGaps: 3, unresolvedGapCount: 3,
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    const intents = [
      intent(EVENT_NAMES.intents.criRefreshRequested),
      intent(EVENT_NAMES.intents.talentProfileRefreshRequested),
      intent(EVENT_NAMES.intents.growthRecommendationRefreshRequested),
      intent(EVENT_NAMES.intents.teacherTrustRefreshRequested),
      intent(EVENT_NAMES.intents.mentorReputationRefreshRequested),
    ];

    const result = applyDecisionSafety({
      intents, crossDecision, maxIntents: 5,
      eventName: "case2_evidence", entityId: "t1", traceId: "test-trace",
    });

    // All intents should have cross-domain tags
    for (const i of result.intents) {
      expect(i.payload.crossDomainScenario).toBe("rejection_plus_mentorship_evidence");
      expect(i.payload.promoteAdvanced).toBe(true);
      expect(i.payload.suppressBeginner).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// Case 3: high CRI user → minimal recommendations
// ══════════════════════════════════════════════════════════════

describe("Case 3: High CRI user (minimal recommendations)", () => {
  it("cross-domain detects high CRI + full trust → minimizes recs", () => {
    const crossCtx = makeCrossCtx({
      criScore: 72, criBand: "strong",
      trustStatus: "full", verifiedCount: 8, totalCredentials: 8, verificationRatio: 1.0,
      hiringAdvantageCount: 3,
      totalGaps: 1, hasCriticalGaps: false,
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    expect(crossDecision.scenario).toBe("high_cri_verified_evidence");
    expect(crossDecision.minimizeRecommendations).toBe(true);
    expect(crossDecision.boostMatching).toBe(true);
    expect(crossDecision.priorityOverride).toBe("low");
  });

  it("full pipeline: all recommendation intents stripped", () => {
    const crossCtx = makeCrossCtx({
      criScore: 72, criBand: "strong",
      trustStatus: "full", verifiedCount: 8, totalCredentials: 8, verificationRatio: 1.0,
      hiringAdvantageCount: 3,
      totalGaps: 1, hasCriticalGaps: false,
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    const intents = [
      intent(EVENT_NAMES.intents.criRefreshRequested),
      intent(EVENT_NAMES.intents.skillGapRefreshRequested),
      intent(EVENT_NAMES.intents.trainingRecommendationRequested),
      intent(EVENT_NAMES.intents.growthRecommendationRefreshRequested),
      intent(EVENT_NAMES.intents.matchRefreshRequested),
    ];

    const result = applyDecisionSafety({
      intents, crossDecision, maxIntents: 5,
      eventName: "case3_high_cri", entityId: "t1", traceId: "test-trace",
    });

    // Rec intents should be removed entirely
    const recIntents = result.intents.filter(
      (i) =>
        i.intent === EVENT_NAMES.intents.trainingRecommendationRequested ||
        i.intent === EVENT_NAMES.intents.growthRecommendationRefreshRequested,
    );
    expect(recIntents).toHaveLength(0);

    // CRI, gaps, match should survive
    expect(result.intents.some((i) => i.intent === EVENT_NAMES.intents.criRefreshRequested)).toBe(true);
    expect(result.intents.some((i) => i.intent === EVENT_NAMES.intents.skillGapRefreshRequested)).toBe(true);
    expect(result.overlayReduced).toBe(2); // 2 rec intents removed
  });

  it("conflict resolution double-checks: no rec intents leak through", () => {
    const crossCtx = makeCrossCtx({
      criScore: 72, criBand: "strong",
      trustStatus: "full", verifiedCount: 8, totalCredentials: 8, verificationRatio: 1.0,
      hiringAdvantageCount: 3,
      totalGaps: 1, hasCriticalGaps: false,
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    // Even if somehow a rec intent sneaks through with the scenario tag
    const intents: IntentEmission[] = [
      {
        intent: EVENT_NAMES.intents.trainingRecommendationRequested as any,
        payload: {
          teacherId: "t1",
          crossDomainScenario: "high_cri_verified_evidence",
        },
      },
      intent(EVENT_NAMES.intents.criRefreshRequested),
    ];

    const result = applyDecisionSafety({
      intents, crossDecision, maxIntents: 5,
      eventName: "case3_conflict", entityId: "t1", traceId: "test-trace",
    });

    // Conflict resolution should catch it
    const recIntents = result.intents.filter(
      (i) => i.intent === EVENT_NAMES.intents.trainingRecommendationRequested,
    );
    expect(recIntents).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Case 4: low CRI + repeated failure → focused guidance only
// ══════════════════════════════════════════════════════════════

describe("Case 4: Low CRI + repeated failures (focused guidance only)", () => {
  it("cross-domain detects low CRI + critical gaps → restricts recs", () => {
    const crossCtx = makeCrossCtx({
      criScore: 18, criBand: "low",
      totalGaps: 6, hasCriticalGaps: true,
      gapCategories: ["certification", "subject", "curriculum", "skill"],
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    expect(crossDecision.scenario).toBe("low_cri_repeated_failures");
    expect(crossDecision.recommendationCap).toBe(2);
    expect(crossDecision.foundationalOnly).toBe(true);
    expect(crossDecision.priorityOverride).toBe("high");
    expect(crossDecision.promoteAdvanced).toBe(false);
  });

  it("full pipeline: caps recs to 2 and tags foundational", () => {
    const crossCtx = makeCrossCtx({
      criScore: 18, criBand: "low",
      totalGaps: 6, hasCriticalGaps: true,
      gapCategories: ["certification", "subject", "curriculum"],
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    const intents = [
      intent(EVENT_NAMES.intents.skillGapRefreshRequested),
      intent(EVENT_NAMES.intents.trainingRecommendationRequested),
      intent(EVENT_NAMES.intents.growthRecommendationRefreshRequested),
      intent(EVENT_NAMES.intents.criRefreshRequested),
      intent(EVENT_NAMES.intents.reputationRefreshRequested),
    ];

    const result = applyDecisionSafety({
      intents, crossDecision, maxIntents: 4,
      eventName: "case4_low_cri", entityId: "t1", traceId: "test-trace",
    });

    // At most 2 rec intents survive
    const recIntents = result.intents.filter(
      (i) =>
        i.intent === EVENT_NAMES.intents.trainingRecommendationRequested ||
        i.intent === EVENT_NAMES.intents.growthRecommendationRefreshRequested,
    );
    expect(recIntents.length).toBeLessThanOrEqual(2);

    // All intents tagged foundationalOnly
    for (const i of result.intents) {
      expect(i.payload.foundationalOnly).toBe(true);
    }

    // Budget enforced
    expect(result.intents.length).toBeLessThanOrEqual(4);
  });

  it("priority-aware budget: CRI + gaps survive over recs under tight budget", () => {
    const crossCtx = makeCrossCtx({
      criScore: 18, criBand: "low",
      totalGaps: 6, hasCriticalGaps: true,
      gapCategories: ["certification", "subject", "curriculum"],
    });
    const crossDecision = resolveCrossDomainDecision(crossCtx, "test-trace");

    const intents = [
      intent(EVENT_NAMES.intents.trainingRecommendationRequested),
      intent(EVENT_NAMES.intents.growthRecommendationRefreshRequested),
      intent(EVENT_NAMES.intents.criRefreshRequested),
      intent(EVENT_NAMES.intents.skillGapRefreshRequested),
      intent(EVENT_NAMES.intents.reputationRefreshRequested),
    ];

    // Tight budget of 2
    const result = applyDecisionSafety({
      intents, crossDecision, maxIntents: 2,
      eventName: "case4_tight_budget", entityId: "t1", traceId: "test-trace",
    });

    expect(result.intents).toHaveLength(2);
    const intentNames = result.intents.map((i) => i.intent);
    // CRI (pri 10) and gaps (pri 9) should survive over recs (pri 3)
    expect(intentNames).toContain(EVENT_NAMES.intents.criRefreshRequested);
    expect(intentNames).toContain(EVENT_NAMES.intents.skillGapRefreshRequested);
  });
});
