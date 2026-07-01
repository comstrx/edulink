/**
 * Sprint 12 — Cross-Domain Decision Scenarios Tests
 *
 * Verifies all 4 cross-domain scenarios detect correctly
 * and produce the right decision modifiers.
 */

import { describe, it, expect } from "vitest";
import {
  resolveCrossDomainDecision,
  type CrossDomainDecision,
} from "@/smart-glue/decision-engine";
import type { CrossDomainContext } from "@/smart-glue/intelligence/cross-domain-context.reader";
import type { GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";

// ── Fixture builder ────────────────────────────────────────────

function makeCtx(overrides: Partial<{
  criScore: number | null;
  criBand: CrossDomainContext["cri"]["band"];
  criGapTermIds: string[];
  totalGaps: number;
  hasCriticalGaps: boolean;
  gapCategories: string[];
  recCount: number;
  trustStatus: CrossDomainContext["trust"]["overallStatus"];
  verifiedCount: number;
  totalCredentials: number;
  verificationRatio: number;
  readiness: string;
  momentum: string;
  credentialStrength: string;
  unresolvedGapCount: number;
  hiringAdvantageCount: number;
  needsGuidance: boolean;
  hiringReady: boolean;
  activelyGrowing: boolean;
  hasCriAlignedGaps: boolean;
}> = {}): CrossDomainContext {
  const o = {
    criScore: 50, criBand: "emerging" as const, criGapTermIds: [],
    totalGaps: 2, hasCriticalGaps: false, gapCategories: ["skill"],
    recCount: 0,
    trustStatus: "partial" as const, verifiedCount: 1, totalCredentials: 3, verificationRatio: 0.33,
    readiness: "developing", momentum: "active", credentialStrength: "basic",
    unresolvedGapCount: 2, hiringAdvantageCount: 0,
    needsGuidance: true, hiringReady: false, activelyGrowing: true, hasCriAlignedGaps: false,
    ...overrides,
  };

  const gapCategory = (o.gapCategories[0] ?? "skill") as GapEntry["category"];

  return {
    teacherId: "t-001",
    available: true,
    cri: { available: o.criScore != null, score: o.criScore, band: o.criBand, gapTermIds: o.criGapTermIds, jobId: "j-1" },
    gaps: {
      available: true, totalGaps: o.totalGaps,
      topGaps: [{ termId: "t1", label: "Gap1", category: gapCategory, source: "job_requirement" as const, severity: "medium" as const }],
      categories: o.gapCategories, hasCriticalGaps: o.hasCriticalGaps,
    },
    recommendations: { available: true, totalCount: o.recCount, hasExisting: o.recCount > 0, staleness: "fresh" },
    trust: { available: true, overallStatus: o.trustStatus, verifiedCount: o.verifiedCount, totalCount: o.totalCredentials, verificationRatio: o.verificationRatio },
    talent: {
      available: true, readinessLevel: o.readiness, growthMomentum: o.momentum,
      credentialStrength: o.credentialStrength, unresolvedGapCount: o.unresolvedGapCount,
      hiringAdvantageCount: o.hiringAdvantageCount,
    },
    signals: {
      needsGuidance: o.needsGuidance, hiringReady: o.hiringReady,
      activelyGrowing: o.activelyGrowing, hasCriAlignedGaps: o.hasCriAlignedGaps,
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe("Sprint 12 — Cross-Domain Decision Scenarios", () => {
  describe("Scenario 1: Rejection + Training Improvement", () => {
    it("detects when gaps are reducing and teacher is growing", () => {
      const ctx = makeCtx({
        totalGaps: 5,            // gap snapshot shows 5
        unresolvedGapCount: 3,   // talent shows only 3 unresolved → reducing
        activelyGrowing: true,
        momentum: "active",
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).toBe("rejection_plus_training_improvement");
      expect(d.boostMatching).toBe(true);
      expect(d.suppressBeginner).toBe(true);
      expect(d.promoteAdvanced).toBe(true);
      expect(d.recommendationCap).toBe(3);
    });

    it("does NOT trigger when gaps are not reducing", () => {
      const ctx = makeCtx({ totalGaps: 3, unresolvedGapCount: 3 });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).not.toBe("rejection_plus_training_improvement");
    });

    it("does NOT trigger when teacher is inactive", () => {
      const ctx = makeCtx({
        totalGaps: 5, unresolvedGapCount: 3,
        activelyGrowing: false, momentum: "inactive",
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).not.toBe("rejection_plus_training_improvement");
    });
  });

  describe("Scenario 2: Rejection + Mentorship Evidence", () => {
    it("detects verified evidence + active growth", () => {
      const ctx = makeCtx({
        verifiedCount: 3, totalCredentials: 5, verificationRatio: 0.6,
        activelyGrowing: true, momentum: "emerging",
        // Ensure scenario 1 doesn't match (gaps not reducing)
        totalGaps: 2, unresolvedGapCount: 2,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).toBe("rejection_plus_mentorship_evidence");
      expect(d.suppressBeginner).toBe(true);
      expect(d.promoteAdvanced).toBe(true);
      expect(d.boostMatching).toBe(false);
    });

    it("does NOT trigger without verified evidence", () => {
      const ctx = makeCtx({
        verifiedCount: 0, totalCredentials: 3, verificationRatio: 0,
        totalGaps: 2, unresolvedGapCount: 2,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).not.toBe("rejection_plus_mentorship_evidence");
    });
  });

  describe("Scenario 3: High CRI + Verified + Evidence", () => {
    it("detects strong CRI + full trust + hiring advantages", () => {
      const ctx = makeCtx({
        criScore: 72, criBand: "strong",
        trustStatus: "full", verifiedCount: 5, totalCredentials: 5, verificationRatio: 1.0,
        hiringAdvantageCount: 3,
        // Prevent scenario 4 from matching
        totalGaps: 1, hasCriticalGaps: false,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).toBe("high_cri_verified_evidence");
      expect(d.minimizeRecommendations).toBe(true);
      expect(d.recommendationCap).toBe(1);
      expect(d.priorityOverride).toBe("low");
    });

    it("does NOT trigger with low CRI", () => {
      const ctx = makeCtx({
        criScore: 40, criBand: "emerging",
        trustStatus: "full", verifiedCount: 5, totalCredentials: 5, verificationRatio: 1.0,
        hiringAdvantageCount: 3,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).not.toBe("high_cri_verified_evidence");
    });

    it("does NOT trigger without hiring advantages", () => {
      const ctx = makeCtx({
        criScore: 72, criBand: "strong",
        trustStatus: "full", verificationRatio: 1.0,
        hiringAdvantageCount: 0,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).not.toBe("high_cri_verified_evidence");
    });
  });

  describe("Scenario 4: Low CRI + Repeated Failures", () => {
    it("detects low CRI + many critical gaps", () => {
      const ctx = makeCtx({
        criScore: 20, criBand: "not_ready",
        totalGaps: 5, hasCriticalGaps: true,
        gapCategories: ["certification", "subject", "skill"],
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).toBe("low_cri_repeated_failures");
      expect(d.recommendationCap).toBe(2);
      expect(d.foundationalOnly).toBe(true);
      expect(d.priorityOverride).toBe("high");
      expect(d.promoteAdvanced).toBe(false);
    });

    it("does NOT trigger with moderate CRI", () => {
      const ctx = makeCtx({
        criScore: 40, criBand: "emerging",
        totalGaps: 5, hasCriticalGaps: true,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).not.toBe("low_cri_repeated_failures");
    });

    it("does NOT trigger without critical gaps", () => {
      const ctx = makeCtx({
        criScore: 20, criBand: "not_ready",
        totalGaps: 5, hasCriticalGaps: false,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).not.toBe("low_cri_repeated_failures");
    });
  });

  describe("No scenario match", () => {
    it("returns 'none' when no conditions are met", () => {
      const ctx = makeCtx({
        criScore: 50, criBand: "emerging",
        totalGaps: 2, unresolvedGapCount: 2, hasCriticalGaps: false,
        verifiedCount: 0, activelyGrowing: false, momentum: "inactive",
        hiringAdvantageCount: 0,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).toBe("none");
      expect(d.recommendationCap).toBeNull();
      expect(d.promoteAdvanced).toBe(false);
    });

    it("returns 'none' for unavailable context", () => {
      const d = resolveCrossDomainDecision(undefined, "test-trace");
      expect(d.scenario).toBe("none");
    });
  });

  describe("Scenario priority (mutual exclusivity)", () => {
    it("scenario 4 takes priority over scenario 1 when both could match", () => {
      const ctx = makeCtx({
        criScore: 20, criBand: "not_ready",
        totalGaps: 5, hasCriticalGaps: true, gapCategories: ["certification", "subject", "skill"],
        unresolvedGapCount: 3,  // gaps reducing
        activelyGrowing: true,  // also growing
        verifiedCount: 2,       // has evidence
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      // Scenario 4 should win because it's checked first (most restrictive)
      expect(d.scenario).toBe("low_cri_repeated_failures");
    });

    it("scenario 3 takes priority over scenario 1", () => {
      const ctx = makeCtx({
        criScore: 72, criBand: "strong",
        trustStatus: "full", verifiedCount: 5, totalCredentials: 5, verificationRatio: 1.0,
        hiringAdvantageCount: 3,
        totalGaps: 5, unresolvedGapCount: 3,  // gaps reducing
        activelyGrowing: true,
        hasCriticalGaps: false,
      });
      const d = resolveCrossDomainDecision(ctx, "test-trace");
      expect(d.scenario).toBe("high_cri_verified_evidence");
    });
  });
});
