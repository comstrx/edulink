/**
 * Intelligence Explainability Layer — Tests
 *
 * Verifies explanation adapters produce correct, audience-aware,
 * human-readable explanations without exposing raw internals.
 *
 * Phase 4.3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { explainCri } from "@/intelligence/explainability/adapters/cri-explanation.adapter";
import { explainMatch } from "@/intelligence/explainability/adapters/match-explanation.adapter";
import { explainGap } from "@/intelligence/explainability/adapters/gap-explanation.adapter";
import { explainRecommendation } from "@/intelligence/explainability/adapters/recommendation-explanation.adapter";
import { explainVerification } from "@/intelligence/explainability/adapters/verification-explanation.adapter";
import { trackExplanationView, getExplanationViewCounts, clearExplanationViewLog } from "@/intelligence/explainability/observability/explanation-tracker";
import { FALLBACK_EXPLANATION } from "@/intelligence/explainability/types/explanation.types";
import type { CriConsumptionData, MatchConsumptionData, GapConsumptionData, RecommendationConsumptionData, VerifiedStateConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";

// ── Fixtures ───────────────────────────────────────────────────

const criData: CriConsumptionData = {
  score: 72,
  band: "moderate",
  dimensions: [
    { dimension: "profile", label: "Profile Completeness", score: 18, maxScore: 20, met: true },
    { dimension: "training", label: "Professional Development", score: 12, maxScore: 25, met: false },
    { dimension: "trust", label: "Trust & Verification", score: 20, maxScore: 30, met: false },
    { dimension: "hiring", label: "Hiring Signals", score: 22, maxScore: 25, met: true },
  ],
  gapTermIds: ["gap-1", "gap-2"],
  jobId: "job-1",
};

const matchData: MatchConsumptionData = {
  score: 75,
  confidence: "high",
  dimensions: [
    { dimension: "subject", label: "Subject", score: 20, maxScore: 20, matched: true, reason: "Subject matches" },
    { dimension: "experience", label: "Experience", score: 15, maxScore: 20, matched: true, reason: "5+ years" },
    { dimension: "cert", label: "Certification", score: 0, maxScore: 20, matched: false, reason: "Missing TEFL" },
  ],
  matchedTermIds: ["t1", "t2"],
  unmatchedTermIds: ["t3"],
  jobId: "job-1",
};

const gapData: GapConsumptionData = {
  gaps: [
    { gapId: "g1", gapType: "missing", label: "TEFL Certificate", severity: "high", confidence: "high", category: "certification", evidenceSources: ["profile"] },
    { gapId: "g2", gapType: "missing", label: "Arabic Language", severity: "medium", confidence: "medium", category: "language", evidenceSources: ["profile"] },
  ],
  totalGaps: 2,
  priorityGapIds: ["g1"],
  groupedSummary: [
    { category: "certification", count: 1, highestSeverity: "high" },
    { category: "language", count: 1, highestSeverity: "medium" },
  ],
  jobId: null,
};

const recData: RecommendationConsumptionData = {
  recommendations: [
    { recommendationId: "r1", type: "training", priority: "high", confidence: "high", reasonCodes: ["addresses_gaps"], relatedGapIds: ["g1"], groupKey: "certification", actionLabelKey: "earn_tefl_certificate" },
    { recommendationId: "r2", type: "pathway", priority: "medium", confidence: "medium", reasonCodes: ["career_growth"], relatedGapIds: [], groupKey: "professional_development", actionLabelKey: "start_leadership_pathway" },
  ],
  topRecommendationIds: ["r1"],
  totalCount: 2,
  groupedSummary: [
    { groupKey: "certification", label: "Certification", count: 1, highestPriority: "high" },
    { groupKey: "professional_development", label: "Professional Development", count: 1, highestPriority: "medium" },
  ],
};

const verifiedData: VerifiedStateConsumptionData = {
  overallStatus: "partial",
  credentials: [
    { termId: "c1", credentialType: "teaching_license", verified: true, verifiedAt: "2025-01-15T00:00:00Z" },
    { termId: "c2", credentialType: "degree", verified: false },
  ],
  verifiedCount: 1,
  totalCount: 2,
};

// ── CRI Explanation ────────────────────────────────────────────

describe("CRI Explanation Adapter", () => {
  it("returns fallback for null data", () => {
    const result = explainCri(null, "teacher");
    expect(result.headline).toBe(FALLBACK_EXPLANATION.headline);
    expect(result.signal).toBe("cri");
  });

  it("teacher sees strengths, improvements, and suggestion", () => {
    const result = explainCri(criData, "teacher");
    expect(result.headline).toContain("readiness");
    expect(result.evidencePoints.length).toBeGreaterThan(0);
    expect(result.evidencePoints.some((p) => p.sentiment === "positive")).toBe(true);
    expect(result.evidencePoints.some((p) => p.sentiment === "negative")).toBe(true);
    expect(result.suggestion).toBeTruthy();
  });

  it("school sees no suggestion and no negative detail", () => {
    const result = explainCri(criData, "school");
    expect(result.suggestion).toBeNull();
    expect(result.evidencePoints.every((p) => p.sentiment !== "negative")).toBe(true);
  });

  it("evidence never exceeds 5 points", () => {
    const result = explainCri(criData, "admin");
    expect(result.evidencePoints.length).toBeLessThanOrEqual(5);
  });
});

// ── Match Explanation ──────────────────────────────────────────

describe("Match Explanation Adapter", () => {
  it("returns fallback for null data", () => {
    const result = explainMatch(null, "teacher");
    expect(result.headline).toBe(FALLBACK_EXPLANATION.headline);
  });

  it("teacher sees gap details and suggestion", () => {
    const result = explainMatch(matchData, "teacher");
    expect(result.headline).toContain("match");
    expect(result.evidencePoints.some((p) => p.sentiment === "negative")).toBe(true);
    expect(result.suggestion).toBeTruthy();
  });

  it("school sees unmatched count but not individual gaps", () => {
    const result = explainMatch(matchData, "school");
    const negatives = result.evidencePoints.filter((p) => p.sentiment === "negative");
    expect(negatives.length).toBe(0);
    expect(result.suggestion).toBeNull();
  });
});

// ── Gap Explanation ────────────────────────────────────────────

describe("Gap Explanation Adapter", () => {
  it("returns fallback for null data", () => {
    const result = explainGap(null, "teacher");
    expect(result.headline).toBe(FALLBACK_EXPLANATION.headline);
  });

  it("returns clean message for zero gaps", () => {
    const result = explainGap({ ...gapData, totalGaps: 0, gaps: [], groupedSummary: [] }, "teacher");
    expect(result.headline).toBe("No gaps identified");
    expect(result.evidencePoints.length).toBe(0);
  });

  it("teacher sees specific gap items", () => {
    const result = explainGap(gapData, "teacher");
    expect(result.evidencePoints.length).toBe(2);
    expect(result.evidencePoints[0].label).toBe("TEFL Certificate");
    expect(result.suggestion).toBeTruthy();
  });

  it("school sees category-level summary only", () => {
    const result = explainGap(gapData, "school");
    expect(result.evidencePoints.every((p) => p.sentiment === "neutral")).toBe(true);
    expect(result.suggestion).toBeNull();
  });
});

// ── Recommendation Explanation ─────────────────────────────────

describe("Recommendation Explanation Adapter", () => {
  it("returns fallback for null data", () => {
    const result = explainRecommendation(null, "teacher");
    expect(result.headline).toBe(FALLBACK_EXPLANATION.headline);
  });

  it("returns fallback for school audience", () => {
    const result = explainRecommendation(recData, "school");
    expect(result.headline).toBe(FALLBACK_EXPLANATION.headline);
  });

  it("teacher sees priority actions and suggestion", () => {
    const result = explainRecommendation(recData, "teacher");
    expect(result.headline).toContain("priority");
    expect(result.evidencePoints.length).toBeGreaterThan(0);
    expect(result.suggestion).toBeTruthy();
  });
});

// ── Verification Explanation ───────────────────────────────────

describe("Verification Explanation Adapter", () => {
  it("returns fallback for null data", () => {
    const result = explainVerification(null, "teacher");
    expect(result.headline).toBe(FALLBACK_EXPLANATION.headline);
  });

  it("teacher sees credential-level detail and suggestion", () => {
    const result = explainVerification(verifiedData, "teacher");
    expect(result.headline).toBe("Partially verified");
    expect(result.evidencePoints.some((p) => p.label.toLowerCase().includes("teaching license"))).toBe(true);
    expect(result.suggestion).toBeTruthy();
  });

  it("school sees only percentage-based summary", () => {
    const result = explainVerification(verifiedData, "school");
    expect(result.evidencePoints.length).toBe(1);
    expect(result.evidencePoints[0].label).toBe("Verification progress");
    expect(result.suggestion).toBeNull();
  });

  it("public sees minimal explanation", () => {
    const result = explainVerification(verifiedData, "public");
    expect(result.evidencePoints.length).toBe(0);
    expect(result.suggestion).toBeNull();
  });
});

// ── Observability ──────────────────────────────────────────────

describe("Explanation Observability", () => {
  beforeEach(() => clearExplanationViewLog());

  it("tracks view events and counts by signal", () => {
    trackExplanationView("cri", "teacher");
    trackExplanationView("cri", "teacher");
    trackExplanationView("match", "school");

    const counts = getExplanationViewCounts();
    expect(counts.cri).toBe(2);
    expect(counts.match).toBe(1);
  });
});
