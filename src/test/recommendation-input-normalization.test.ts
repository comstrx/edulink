/**
 * Recommendation Input Normalization — Unit Tests
 *
 * Tests the pure assembleRecommendationInputFromRaw function
 * across various teacher scenarios.
 *
 * Phase 7B
 */

import { describe, it, expect } from "vitest";
import { assembleRecommendationInputFromRaw } from "@/intelligence/recommendations/engine/recommendation-engine.inputs";
import type { RecommendationRawData } from "@/intelligence/recommendations/engine/recommendation-data-loader";

const TEACHER_ID = "teacher-rec-test";

function emptyRaw(): RecommendationRawData {
  return {
    teacherProfile: null,
    criSnapshot: null,
    gapSnapshot: null,
    matchSnapshots: [],
    verifiedState: null,
    trainingCatalog: [],
    activePathways: [],
    executionsMissingEvidence: [],
    evidenceNeedingRevision: [],
    evidencePendingReview: [],
    completionsWithoutVerification: [],
    rejectionReasonTermIds: [],
    completedItemIds: [],
    pathwayCriTargets: [],
  };
}

function baseProfile() {
  return {
    id: TEACHER_ID,
    full_name: "Test Teacher",
    bio: "Experienced educator",
    avatar_url: "https://example.com/avatar.jpg",
    contact_email: "test@example.com",
    cv_url: "https://example.com/cv.pdf",
    subject_ids: ["sub-1", "sub-2"],
    curriculum_ids: ["cur-1"],
    grade_band_ids: ["gb-1"],
    language_ids: ["lang-1"],
    country_id: "country-1",
    region_id: "region-1",
    city_id: "city-1",
    years_of_experience: 5,
    education: [{ degree: "MEd" }],
    experience: [{ years: 5 }],
    completed_training: null,
  };
}

describe("assembleRecommendationInputFromRaw", () => {
  it("produces valid input from completely empty raw data", () => {
    const result = assembleRecommendationInputFromRaw(TEACHER_ID, emptyRaw());

    expect(result.teacherId).toBe(TEACHER_ID);
    expect(result.criSignals.criScore).toBe(0);
    expect(result.criSignals.criBand).toBe("not_ready");
    expect(result.gapSignals.gapItems).toEqual([]);
    expect(result.matchSignals.recentMatchScores).toEqual([]);
    expect(result.trustSignals.identityVerified).toBe(false);
    expect(result.profileSignals.missingCoreProfileFields).toContain("full_profile");
    expect(result.trainingCatalogSignals.availableCourseIds).toEqual([]);
  });

  it("normalizes CRI snapshot with band derivation", () => {
    const raw = emptyRaw();
    raw.criSnapshot = {
      score: 72,
      dimensions: [
        { component: "profile", score: 25, maxScore: 30, met: true },
        { component: "training", score: 10, maxScore: 25, met: false },
      ],
      engine_version: "rule-v1",
      computed_at: "2026-03-01T00:00:00Z",
    };

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.criSignals.criScore).toBe(72);
    expect(result.criSignals.criBand).toBe("strong");
    expect(result.criSignals.componentScores).toHaveLength(2);
    expect(result.criSignals.componentScores[0].component).toBe("profile");
  });

  it("normalizes gap snapshot with priority extraction", () => {
    const raw = emptyRaw();
    raw.gapSnapshot = {
      gaps: [
        { gapId: "gap-1", gapType: "certification_gap", label: "Missing TEFL", severity: "high", confidence: "medium", evidenceSources: ["profile_analysis"] },
        { gapId: "gap-2", gapType: "profile_gap", label: "Missing bio", severity: "low", confidence: "low", evidenceSources: ["profile_analysis"] },
        { gapId: "gap-3", gapType: "curriculum_gap", label: "Missing IB", severity: "critical", confidence: "high", evidenceSources: ["match_result"], taxonomyTermId: "cur-ib" },
      ],
      total_gaps: 3,
      computed_at: "2026-03-01T00:00:00Z",
    };

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.gapSignals.gapItems).toHaveLength(3);
    expect(result.gapSignals.priorityGapIds).toContain("gap-1");
    expect(result.gapSignals.priorityGapIds).toContain("gap-3");
    expect(result.gapSignals.priorityGapIds).not.toContain("gap-2");
    expect(result.gapSignals.groupedGapSummary).toHaveLength(3);
  });

  it("derives repeated match gap patterns from multiple snapshots", () => {
    const raw = emptyRaw();
    raw.matchSnapshots = [
      { job_id: "j1", score: 55, confidence: "medium", dimensions: [], matched_term_ids: ["t1"], unmatched_term_ids: ["cur-ib", "cert-tefl"], computed_at: "2026-03-01T00:00:00Z" },
      { job_id: "j2", score: 45, confidence: "low", dimensions: [], matched_term_ids: ["t1"], unmatched_term_ids: ["cur-ib", "lang-fr"], computed_at: "2026-03-02T00:00:00Z" },
      { job_id: "j3", score: 70, confidence: "high", dimensions: [], matched_term_ids: ["t1", "cur-ib"], unmatched_term_ids: ["cert-tefl"], computed_at: "2026-03-03T00:00:00Z" },
    ];

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.matchSignals.recentMatchScores).toHaveLength(3);
    expect(result.matchSignals.repeatedMatchGapPatterns).toContain("cur-ib");
    expect(result.matchSignals.repeatedMatchGapPatterns).toContain("cert-tefl");
    expect(result.matchSignals.repeatedMatchGapPatterns).not.toContain("lang-fr");
  });

  it("normalizes trust signals from verified state", () => {
    const raw = emptyRaw();
    raw.verifiedState = {
      overall_status: "partial",
      credentials: [
        { credentialType: "degree", verified: true },
        { credentialType: "certification", verified: false },
      ],
      verified_count: 1,
      total_count: 2,
    };

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.trustSignals.educationVerified).toBe(true);
    expect(result.trustSignals.credentialVerified).toBe(false);
    expect(result.trustSignals.identityVerified).toBe(false);
  });

  it("computes profile completeness with missing fields", () => {
    const raw = emptyRaw();
    raw.teacherProfile = {
      ...baseProfile(),
      bio: null,
      cv_url: null,
      subject_ids: null,
    };

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.profileSignals.missingCoreProfileFields).toContain("bio");
    expect(result.profileSignals.missingCoreProfileFields).toContain("cv");
    expect(result.profileSignals.missingCoreProfileFields).toContain("subjects");
    expect(result.profileSignals.profileCompletenessScore).toBeLessThan(100);
    expect(result.profileSignals.profileCompletenessScore).toBeGreaterThan(0);
  });

  it("produces full profile completeness for complete teacher", () => {
    const raw = emptyRaw();
    raw.teacherProfile = baseProfile();

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.profileSignals.profileCompletenessScore).toBe(100);
    expect(result.profileSignals.missingCoreProfileFields).toHaveLength(0);
    expect(result.profileSignals.subjectMappings).toEqual(["sub-1", "sub-2"]);
  });

  it("builds training catalog signals with term mapping", () => {
    const raw = emptyRaw();
    raw.trainingCatalog = [
      { id: "tr-1", title: "TEFL Prep", type: "course", subject_term_ids: ["sub-1"], skill_term_ids: null, curriculum_term_ids: ["cur-1"], grade_band_term_ids: null, credential_eligible: true, provider_id: null },
      { id: "tr-2", title: "IB Pathway", type: "pathway", subject_term_ids: null, skill_term_ids: ["sk-1"], curriculum_term_ids: ["cur-ib"], grade_band_term_ids: null, credential_eligible: false, provider_id: null },
      { id: "tr-3", title: "Math Methods", type: "course", subject_term_ids: ["sub-1"], skill_term_ids: null, curriculum_term_ids: null, grade_band_term_ids: null, credential_eligible: false, provider_id: null },
    ];

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.trainingCatalogSignals.availableCourseIds).toEqual(["tr-1", "tr-3"]);
    expect(result.trainingCatalogSignals.availablePathwayIds).toEqual(["tr-2"]);
    expect(result.trainingCatalogSignals.certificationPreparationOffers).toEqual(["tr-1"]);
    expect(result.trainingCatalogSignals.mappedTrainingByTaxonomyTerm["sub-1"]).toEqual(["tr-1", "tr-3"]);
    expect(result.trainingCatalogSignals.mappedTrainingByTaxonomyTerm["cur-ib"]).toEqual(["tr-2"]);
  });

  it("handles certification gap + matching training scenario", () => {
    const raw = emptyRaw();
    raw.teacherProfile = baseProfile();
    raw.gapSnapshot = {
      gaps: [
        { gapId: "gap-cert", gapType: "certification_gap", label: "Missing TEFL", severity: "high", confidence: "high", evidenceSources: ["profile_analysis", "match_result"], taxonomyTermId: "cert-tefl" },
      ],
      total_gaps: 1,
      computed_at: "2026-03-01T00:00:00Z",
    };
    raw.trainingCatalog = [
      { id: "tr-tefl", title: "TEFL Certification", type: "course", subject_term_ids: null, skill_term_ids: null, curriculum_term_ids: null, grade_band_term_ids: null, credential_eligible: true, provider_id: null },
    ];

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.gapSignals.gapItems[0].gapId).toBe("gap-cert");
    expect(result.gapSignals.priorityGapIds).toContain("gap-cert");
    expect(result.trainingCatalogSignals.certificationPreparationOffers).toContain("tr-tefl");
  });

  it("handles teacher with strong profile and few gaps", () => {
    const raw = emptyRaw();
    raw.teacherProfile = baseProfile();
    raw.criSnapshot = { score: 85, dimensions: [], engine_version: "rule-v1", computed_at: "2026-03-01T00:00:00Z" };
    raw.gapSnapshot = { gaps: [], total_gaps: 0, computed_at: "2026-03-01T00:00:00Z" };
    raw.verifiedState = {
      overall_status: "full",
      credentials: [
        { credentialType: "degree", verified: true },
        { credentialType: "certification", verified: true },
      ],
      verified_count: 2,
      total_count: 2,
    };

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.criSignals.criBand).toBe("highly_ready");
    expect(result.gapSignals.gapItems).toHaveLength(0);
    expect(result.trustSignals.educationVerified).toBe(true);
    expect(result.trustSignals.credentialVerified).toBe(true);
    expect(result.profileSignals.profileCompletenessScore).toBe(100);
  });

  it("handles missing match snapshots safely", () => {
    const raw = emptyRaw();
    raw.teacherProfile = baseProfile();
    raw.matchSnapshots = [];

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.matchSignals.recentMatchScores).toEqual([]);
    expect(result.matchSignals.repeatedMatchGapPatterns).toEqual([]);
    expect(result.matchSignals.recentMatchBands).toEqual([]);
  });

  it("propagates metadata correctly", () => {
    const raw = emptyRaw();
    raw.criSnapshot = { score: 50, dimensions: [], engine_version: "v1", computed_at: "2026-03-01T00:00:00Z" };

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw, {
      triggeredByEvent: "gap.refreshed",
      triggeredAt: "2026-03-12T10:00:00Z",
    });

    expect(result.metadata.triggeredByEvent).toBe("gap.refreshed");
    expect(result.metadata.triggeredAt).toBe("2026-03-12T10:00:00Z");
    expect(result.metadata.sourceUpdatedAtHints?.cri).toBe("2026-03-01T00:00:00Z");
  });

  it("groups gaps by type with correct severity ranking", () => {
    const raw = emptyRaw();
    raw.gapSnapshot = {
      gaps: [
        { gapId: "g1", gapType: "certification_gap", label: "A", severity: "medium", confidence: "low", evidenceSources: [] },
        { gapId: "g2", gapType: "certification_gap", label: "B", severity: "critical", confidence: "high", evidenceSources: [] },
        { gapId: "g3", gapType: "profile_gap", label: "C", severity: "low", confidence: "low", evidenceSources: [] },
      ],
      total_gaps: 3,
      computed_at: "2026-03-01T00:00:00Z",
    };

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    const certGroup = result.gapSignals.groupedGapSummary.find((g) => g.category === "certification_gap");
    expect(certGroup?.count).toBe(2);
    expect(certGroup?.highestSeverity).toBe("critical");
  });

  it("assigns match bands correctly", () => {
    const raw = emptyRaw();
    raw.matchSnapshots = [
      { job_id: "j1", score: 90, confidence: "high", dimensions: [], matched_term_ids: [], unmatched_term_ids: [], computed_at: "2026-03-01T00:00:00Z" },
      { job_id: "j2", score: 30, confidence: "low", dimensions: [], matched_term_ids: [], unmatched_term_ids: [], computed_at: "2026-03-02T00:00:00Z" },
    ];

    const result = assembleRecommendationInputFromRaw(TEACHER_ID, raw);

    expect(result.matchSignals.recentMatchBands[0]).toBe("strong");
    expect(result.matchSignals.recentMatchBands[1]).toBe("weak");
    expect(result.matchSignals.recentEligibilityFlags[1].eligible).toBe(false);
  });
});
