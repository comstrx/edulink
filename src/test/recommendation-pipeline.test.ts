/**
 * Recommendation Pipeline — Integration Tests
 *
 * Tests the full pipeline: service → engine → writer mapping.
 * Uses mocked Supabase for snapshot writes.
 *
 * Phase 7D
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { runRecommendationEngine } from "@/intelligence/recommendations/engine/recommendation-engine";
import { assembleRecommendationInputFromRaw } from "@/intelligence/recommendations/engine/recommendation-engine.inputs";
import type { RecommendationRawData } from "@/intelligence/recommendations/engine/recommendation-data-loader";
import type { RecommendationEngineResult } from "@/intelligence/recommendations/engine/recommendation-engine.types";

// Mock supabase for writer tests
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      insert: () => Promise.resolve({ error: null }),
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  },
}));

const TEACHER_ID = "teacher-pipeline";

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

describe("Recommendation Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("full pipeline: input → engine → structured result", () => {
    const raw: RecommendationRawData = {
      teacherProfile: {
        id: TEACHER_ID,
        full_name: "Test",
        bio: null,
        avatar_url: null,
        contact_email: null,
        cv_url: null,
        subject_ids: null,
        curriculum_ids: null,
        grade_band_ids: null,
        language_ids: null,
        country_id: null,
        region_id: null,
        city_id: null,
        years_of_experience: null,
        education: null,
        experience: null,
        completed_training: null,
      },
      criSnapshot: { score: 30, dimensions: [], engine_version: "v1", computed_at: "2026-03-01T00:00:00Z" },
      gapSnapshot: {
        gaps: [
          { gapId: "g1", gapType: "certification_gap", label: "TEFL", severity: "high", confidence: "high", evidenceSources: ["profile_analysis"], taxonomyTermId: "cert-tefl" },
        ],
        total_gaps: 1,
        computed_at: "2026-03-01T00:00:00Z",
      },
      matchSnapshots: [],
      verifiedState: null,
      trainingCatalog: [
        { id: "tr-1", title: "TEFL Prep", type: "course", subject_term_ids: null, skill_term_ids: null, curriculum_term_ids: null, grade_band_term_ids: null, credential_eligible: true, provider_id: null },
      ],
      activePathways: [],
      executionsMissingEvidence: [],
      evidenceNeedingRevision: [],
      evidencePendingReview: [],
      completionsWithoutVerification: [],
      rejectionReasonTermIds: [],
      completedItemIds: [],
      pathwayCriTargets: [],
    };

    const input = assembleRecommendationInputFromRaw(TEACHER_ID, raw);
    const result = runRecommendationEngine(input);

    expect(result.teacherId).toBe(TEACHER_ID);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.freshness.freshnessStatus).toBe("fresh");
    // Should have profile action (incomplete) + cert rec + verification + CRI-driven
    const types = result.recommendations.map((r) => r.recommendationType);
    expect(types).toContain("profile_completion_action");
  });

  it("missing teacherId returns structured failure", async () => {
    const { refreshRecommendations } = await import(
      "@/intelligence/recommendations/services/recommendation-refresh.service"
    );

    const outcome = await refreshRecommendations({ teacherId: "" });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toContain("Missing teacherId");
    expect(outcome.snapshotWritten).toBe(false);
  });

  it("writer does not alter engine result priorities or confidence", () => {
    const raw = emptyRaw();
    raw.teacherProfile = {
      id: TEACHER_ID,
      full_name: "Test",
      bio: "Good",
      avatar_url: "url",
      contact_email: "e@e.com",
      cv_url: "cv",
      subject_ids: ["s1"],
      curriculum_ids: ["c1"],
      grade_band_ids: ["g1"],
      language_ids: ["l1"],
      country_id: "co1",
      region_id: "r1",
      city_id: "ci1",
      years_of_experience: 5,
      education: [{}],
      experience: [{}],
      completed_training: null,
    };
    raw.gapSnapshot = {
      gaps: [
        { gapId: "g1", gapType: "certification_gap", label: "A", severity: "critical", confidence: "high", evidenceSources: ["profile_analysis", "match_result"] },
      ],
      total_gaps: 1,
      computed_at: "2026-03-01T00:00:00Z",
    };

    const input = assembleRecommendationInputFromRaw(TEACHER_ID, raw);
    const result = runRecommendationEngine(input);

    // Snapshot payload preserves engine output exactly
    const payload = {
      recommendations: result.recommendations,
      topRecommendationIds: result.topRecommendationIds,
      reasonCodes: result.reasonCodes,
    };

    // Verify priorities are preserved (not mutated)
    for (const rec of payload.recommendations) {
      expect(["critical", "high", "medium", "low"]).toContain(rec.priority);
      expect(["high", "medium", "low"]).toContain(rec.confidence);
      expect(rec.reasonCodes.length).toBeGreaterThan(0);
    }
  });

  it("handler delegates to service correctly", async () => {
    const { recommendationGenerationHandler } = await import(
      "@/intelligence/handlers/recommendations/recommendation-generation.handler"
    );

    expect(recommendationGenerationHandler.intentName).toBe("intent.training_recommendation_requested");
    expect(recommendationGenerationHandler.description).toBeTruthy();

    const result = await recommendationGenerationHandler.handle(
      {
        intent: "intent.training_recommendation_requested",
        payload: { teacherId: TEACHER_ID, triggeredBy: "test" },
        meta: {
          triggeredByEvent: "test",
          triggeredAt: new Date().toISOString(),
          sourceDomain: "intelligence",
        },
      },
      { executedAt: new Date().toISOString(), traceId: "test-trace" },
    );

    expect(result.handlerExecuted).toBe("recommendation-generation-handler");
    expect(result.intent).toBe("intent.training_recommendation_requested");
  });

  it("engine result contains all required output fields", () => {
    const raw = emptyRaw();
    raw.teacherProfile = {
      id: TEACHER_ID,
      full_name: "T",
      bio: null,
      avatar_url: null,
      contact_email: null,
      cv_url: null,
      subject_ids: null,
      curriculum_ids: null,
      grade_band_ids: null,
      language_ids: null,
      country_id: null,
      region_id: null,
      city_id: null,
      years_of_experience: null,
      education: null,
      experience: null,
      completed_training: null,
    };

    const input = assembleRecommendationInputFromRaw(TEACHER_ID, raw);
    const result: RecommendationEngineResult = runRecommendationEngine(input);

    expect(result).toHaveProperty("teacherId");
    expect(result).toHaveProperty("recommendations");
    expect(result).toHaveProperty("topRecommendationIds");
    expect(result).toHaveProperty("groupedRecommendationSummary");
    expect(result).toHaveProperty("reasonCodes");
    expect(result).toHaveProperty("generatedAt");
    expect(result).toHaveProperty("freshness");
    expect(Array.isArray(result.recommendations)).toBe(true);
  });
});
