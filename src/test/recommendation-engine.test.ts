/**
 * Recommendation Engine v1 — Unit Tests
 *
 * Deterministic tests for the recommendation computation engine.
 *
 * Phase 7C
 */

import { describe, it, expect } from "vitest";
import { runRecommendationEngine } from "@/intelligence/recommendations/engine/recommendation-engine";
import type { RecommendationEngineInput } from "@/intelligence/recommendations/engine/recommendation-engine.types";

function baseInput(overrides?: Partial<RecommendationEngineInput>): RecommendationEngineInput {
  return {
    teacherId: "teacher-test",
    criSignals: { criScore: 70, criBand: "strong", componentScores: [], reasonCodes: [] },
    gapSignals: { gapItems: [], priorityGapIds: [], groupedGapSummary: [] },
    matchSignals: { recentMatchScores: [], recentMatchBands: [], repeatedMatchGapPatterns: [], recentEligibilityFlags: [] },
    trustSignals: { identityVerified: true, educationVerified: true, experienceVerified: true, credentialVerified: true },
    profileSignals: { profileCompletenessScore: 100, missingCoreProfileFields: [], subjectMappings: ["s1"], curriculumMappings: ["c1"], gradeBandMappings: ["g1"] },
    trainingCatalogSignals: { availableCourseIds: ["tr-1"], availablePathwayIds: [], mappedTrainingByTaxonomyTerm: {}, certificationPreparationOffers: [] },
    runtimeSignals: { activePathways: [], executionsMissingEvidence: [], evidenceNeedingRevision: [], evidencePendingReview: [], completionsWithoutVerification: [], rejectionReasonTermIds: [], completedItemIds: [], pathwayCriTargets: [] },
    metadata: {},
    ...overrides,
  };
}

describe("runRecommendationEngine", () => {
  it("returns empty recommendations for fully complete teacher", () => {
    const result = runRecommendationEngine(baseInput());
    expect(result.recommendations).toHaveLength(0);
    expect(result.freshness.freshnessStatus).toBe("fresh");
  });

  it("generates profile action first for incomplete profile", () => {
    const result = runRecommendationEngine(
      baseInput({
        profileSignals: { profileCompletenessScore: 25, missingCoreProfileFields: ["bio", "avatar", "subjects", "curriculum"], subjectMappings: [], curriculumMappings: [], gradeBandMappings: [] },
      }),
    );
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].recommendationType).toBe("profile_completion_action");
    expect(result.recommendations[0].priority).toBe("critical");
    expect(result.recommendations[0].reasonCodes).toContain("profile_incomplete");
  });

  it("generates certification recommendation for cert gap with catalog match", () => {
    const result = runRecommendationEngine(
      baseInput({
        gapSignals: {
          gapItems: [
            { gapId: "gap-cert", gapType: "certification_gap", taxonomyTermId: "cert-tefl", label: "Missing TEFL", severity: "high", confidence: "high", evidenceSources: ["profile_analysis", "match_result"] },
          ],
          priorityGapIds: ["gap-cert"],
          groupedGapSummary: [{ category: "certification_gap", count: 1, highestSeverity: "high" }],
        },
        trainingCatalogSignals: {
          availableCourseIds: ["tr-tefl"],
          availablePathwayIds: [],
          mappedTrainingByTaxonomyTerm: { "cert-tefl": ["tr-tefl"] },
          certificationPreparationOffers: ["tr-tefl"],
        },
      }),
    );

    const certRec = result.recommendations.find((r) => r.recommendationType === "certification_recommendation");
    expect(certRec).toBeDefined();
    expect(certRec!.targetId).toBe("tr-tefl");
    expect(certRec!.relatedGapIds).toContain("gap-cert");
    expect(certRec!.reasonCodes).toContain("missing_required_certification");
    expect(certRec!.reasonCodes).toContain("strong_catalog_match_found");
  });

  it("generates verification action for unverified teacher", () => {
    const result = runRecommendationEngine(
      baseInput({
        trustSignals: { identityVerified: false, educationVerified: false, experienceVerified: false, credentialVerified: false },
      }),
    );

    const trustRec = result.recommendations.find((r) => r.recommendationType === "verification_action");
    expect(trustRec).toBeDefined();
    expect(trustRec!.priority).toBe("high");
    expect(trustRec!.reasonCodes).toContain("verification_missing");
  });

  it("generates curriculum alignment action for repeated match mismatch", () => {
    const result = runRecommendationEngine(
      baseInput({
        matchSignals: {
          recentMatchScores: [{ jobId: "j1", score: 40 }, { jobId: "j2", score: 45 }],
          recentMatchBands: ["partial", "partial"],
          repeatedMatchGapPatterns: ["cur-ib"],
          recentEligibilityFlags: [],
        },
      }),
    );

    const curRec = result.recommendations.find((r) => r.recommendationType === "curriculum_alignment_action");
    expect(curRec).toBeDefined();
    expect(curRec!.relatedTaxonomyTermIds).toContain("cur-ib");
    expect(curRec!.reasonCodes).toContain("repeated_curriculum_mismatch");
  });

  it("does not recommend course without catalog match for gap with taxonomy term", () => {
    const result = runRecommendationEngine(
      baseInput({
        gapSignals: {
          gapItems: [
            { gapId: "gap-sub", gapType: "subject_gap", taxonomyTermId: "sub-physics", label: "Physics", severity: "medium", confidence: "medium", evidenceSources: ["match_result"] },
          ],
          priorityGapIds: [],
          groupedGapSummary: [],
        },
        trainingCatalogSignals: { availableCourseIds: ["tr-1"], availablePathwayIds: [], mappedTrainingByTaxonomyTerm: {}, certificationPreparationOffers: [] },
      }),
    );

    const courseRec = result.recommendations.find(
      (r) => r.recommendationType === "course_recommendation" && r.relatedTaxonomyTermIds.includes("sub-physics"),
    );
    expect(courseRec).toBeUndefined();
  });

  it("deduplicates recommendations targeting the same item", () => {
    const result = runRecommendationEngine(
      baseInput({
        gapSignals: {
          gapItems: [
            { gapId: "gap-1", gapType: "certification_gap", taxonomyTermId: "cert-a", label: "Cert A", severity: "high", confidence: "high", evidenceSources: ["profile_analysis"] },
          ],
          priorityGapIds: ["gap-1"],
          groupedGapSummary: [],
        },
        matchSignals: {
          recentMatchScores: [],
          recentMatchBands: [],
          repeatedMatchGapPatterns: ["cert-a"],
          recentEligibilityFlags: [],
        },
        trainingCatalogSignals: {
          availableCourseIds: ["tr-a"],
          availablePathwayIds: [],
          mappedTrainingByTaxonomyTerm: { "cert-a": ["tr-a"] },
          certificationPreparationOffers: ["tr-a"],
        },
      }),
    );

    // cert-a gap creates cert rec + match pattern should not duplicate with a separate course rec
    const certRecs = result.recommendations.filter((r) => r.relatedTaxonomyTermIds.includes("cert-a"));
    // The gap-driven cert rec covers cert-a, so match-pattern should skip it
    expect(certRecs.length).toBeLessThanOrEqual(2);

    // No exact duplicate targetId + type combos
    const keys = result.recommendations.map((r) => `${r.recommendationType}::${r.targetId}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("limits total output count", () => {
    const manyGaps = Array.from({ length: 20 }, (_, i) => ({
      gapId: `gap-${i}`,
      gapType: "certification_gap",
      taxonomyTermId: `cert-${i}`,
      label: `Cert ${i}`,
      severity: "medium" as const,
      confidence: "low" as const,
      evidenceSources: ["profile_analysis"],
    }));

    const termMap: Record<string, string[]> = {};
    for (let i = 0; i < 20; i++) termMap[`cert-${i}`] = [`tr-${i}`];

    const result = runRecommendationEngine(
      baseInput({
        gapSignals: { gapItems: manyGaps, priorityGapIds: [], groupedGapSummary: [] },
        trainingCatalogSignals: {
          availableCourseIds: Array.from({ length: 20 }, (_, i) => `tr-${i}`),
          availablePathwayIds: [],
          mappedTrainingByTaxonomyTerm: termMap,
          certificationPreparationOffers: Array.from({ length: 20 }, (_, i) => `tr-${i}`),
        },
      }),
    );

    expect(result.recommendations.length).toBeLessThanOrEqual(12);
    expect(result.topRecommendationIds.length).toBeLessThanOrEqual(5);
  });

  it("foundational blockers outrank content recommendations", () => {
    const result = runRecommendationEngine(
      baseInput({
        profileSignals: { profileCompletenessScore: 20, missingCoreProfileFields: ["bio", "avatar", "subjects", "curriculum", "location"], subjectMappings: [], curriculumMappings: [], gradeBandMappings: [] },
        trustSignals: { identityVerified: false, educationVerified: false, experienceVerified: false, credentialVerified: false },
        gapSignals: {
          gapItems: [
            { gapId: "gap-1", gapType: "certification_gap", taxonomyTermId: "cert-1", label: "Cert", severity: "medium", confidence: "low", evidenceSources: ["profile_analysis"] },
          ],
          priorityGapIds: [],
          groupedGapSummary: [],
        },
        trainingCatalogSignals: {
          availableCourseIds: ["tr-1"],
          availablePathwayIds: [],
          mappedTrainingByTaxonomyTerm: { "cert-1": ["tr-1"] },
          certificationPreparationOffers: ["tr-1"],
        },
      }),
    );

    // First two should be foundational (profile or verification)
    const foundational = new Set(["profile_completion_action", "verification_action"]);
    expect(foundational.has(result.recommendations[0].recommendationType)).toBe(true);
    expect(foundational.has(result.recommendations[1].recommendationType)).toBe(true);
  });

  it("produces grouped summary and reason codes", () => {
    const result = runRecommendationEngine(
      baseInput({
        profileSignals: { profileCompletenessScore: 50, missingCoreProfileFields: ["bio", "avatar"], subjectMappings: [], curriculumMappings: [], gradeBandMappings: [] },
        trustSignals: { identityVerified: false, educationVerified: true, experienceVerified: true, credentialVerified: true },
      }),
    );

    expect(result.groupedRecommendationSummary.length).toBeGreaterThan(0);
    expect(result.reasonCodes.length).toBeGreaterThan(0);
    expect(result.reasonCodes.every((r) => r.code && r.message)).toBe(true);
  });

  it("generates experience building action for experience gap", () => {
    const result = runRecommendationEngine(
      baseInput({
        gapSignals: {
          gapItems: [
            { gapId: "gap-exp", gapType: "experience_gap", label: "Insufficient experience", severity: "medium", confidence: "medium", evidenceSources: ["match_result"] },
          ],
          priorityGapIds: [],
          groupedGapSummary: [],
        },
      }),
    );

    const expRec = result.recommendations.find((r) => r.recommendationType === "experience_building_action");
    expect(expRec).toBeDefined();
    expect(expRec!.reasonCodes).toContain("experience_gap_detected");
  });
});
