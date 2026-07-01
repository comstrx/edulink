/**
 * CRI Pipeline Integration Tests
 *
 * Tests the service orchestration and writer mapping (pure logic only).
 * Phase 4D
 */
import { describe, it, expect } from "vitest";
import { runCriEngine } from "@/intelligence/cri/engine/cri-engine";
import { assembleCriInputFromRaw } from "@/intelligence/cri/engine/cri-engine.inputs";
import type { CriRawData } from "@/intelligence/cri/engine/cri-data-loader";
import type { CriEngineResult } from "@/intelligence/cri/engine/cri-engine.types";

const TEACHER_ID = "t-pipeline-1";

const defaultGrowth = { completedCourseCount: 0, completedPathwayCount: 0, verifiedCompletionCount: 0, recentCompletionCount: 0, criBoostTotal: 0, approvedEvidenceCount: 0, mentorApprovedCount: 0, activePathwayProgressPercent: 0, earnedCredentialCount: 0 };

const fullRawData: CriRawData = {
  profile: {
    id: TEACHER_ID,
    full_name: "Jane Doe",
    bio: "Experienced teacher",
    avatar_url: "https://example.com/a.jpg",
    cv_url: "https://example.com/cv.pdf",
    subject_ids: ["s1"],
    curriculum_ids: ["c1"],
    grade_band_ids: ["g1"],
    years_of_experience: 5,
    country_id: "co1",
    region_id: "r1",
    city_id: "ci1",
    completed_training: [{ courseId: "t1", completedAt: new Date().toISOString() }],
    education: [{ degree: "BEd" }],
    experience: [{ school: "X" }],
  },
  counts: { skillCount: 3, certificationCount: 1, degreeCount: 1, languageCount: 2 },
  verifiedState: {
    verified_count: 2,
    total_count: 3,
    overall_status: "partial",
    credentials: [
      { type: "identity", status: "verified" },
      { type: "education", status: "verified" },
      { type: "credential", status: "pending" },
    ],
  },
  hiring: { applicationsCount: 3, shortlistedCount: 1, rejectionsCount: 0, interviewsCount: 0 },
  trainingGrowth: defaultGrowth,
};

const emptyRawData: CriRawData = {
  profile: null,
  counts: { skillCount: 0, certificationCount: 0, degreeCount: 0, languageCount: 0 },
  verifiedState: null,
  hiring: { applicationsCount: 0, shortlistedCount: 0, rejectionsCount: 0, interviewsCount: 0 },
  trainingGrowth: defaultGrowth,
};

// ── Full pipeline (input → engine → result) ────────────────────

describe("CRI full pipeline (input → engine)", () => {
  it("produces valid result for complete teacher", () => {
    const input = assembleCriInputFromRaw(TEACHER_ID, fullRawData, { triggeredByEvent: "test" });
    const result = runCriEngine(input);

    expect(result.teacherId).toBe(TEACHER_ID);
    expect(result.criScore).toBeGreaterThanOrEqual(0);
    expect(result.criScore).toBeLessThanOrEqual(100);
    expect(result.criBand).toBeDefined();
    expect(result.componentScores).toHaveLength(4);
    expect(result.reasonCodes.length).toBeGreaterThan(0);
    expect(result.computedAt).toBeDefined();
    expect(result.freshness.isStale).toBe(false);
    expect(result.freshness.freshnessStatus).toBe("fresh");
  });

  it("produces valid result for empty teacher", () => {
    const input = assembleCriInputFromRaw(TEACHER_ID, emptyRawData);
    const result = runCriEngine(input);

    expect(result.criScore).toBeGreaterThanOrEqual(0);
    expect(result.criBand).toBe("not_ready");
    expect(result.componentScores).toHaveLength(4);
  });
});

// ── Writer mapping validation ──────────────────────────────────

describe("CRI writer snapshot shape", () => {
  it("engine result maps cleanly to snapshot fields", () => {
    const input = assembleCriInputFromRaw(TEACHER_ID, fullRawData);
    const result: CriEngineResult = runCriEngine(input);

    // Validate all fields that the writer needs are present
    expect(result.teacherId).toBeTruthy();
    expect(typeof result.criScore).toBe("number");
    expect(result.criBand).toBeTruthy();
    expect(result.componentScores).toBeInstanceOf(Array);
    expect(result.computedAt).toBeTruthy();

    // Each component maps to a dimension
    for (const comp of result.componentScores) {
      expect(comp.component).toBeTruthy();
      expect(comp.label).toBeTruthy();
      expect(typeof comp.score).toBe("number");
      expect(typeof comp.maxScore).toBe("number");
      expect(typeof comp.met).toBe("boolean");
    }
  });

  it("writer does not alter score values", () => {
    const input = assembleCriInputFromRaw(TEACHER_ID, fullRawData);
    const result = runCriEngine(input);

    // Simulate what the writer maps
    const dimensions = result.componentScores.map((c) => ({
      dimension: c.component,
      label: c.label,
      score: c.score,
      maxScore: c.maxScore,
      matched: c.met,
    }));

    // Verify scores are preserved exactly
    for (let i = 0; i < result.componentScores.length; i++) {
      expect(dimensions[i].score).toBe(result.componentScores[i].score);
      expect(dimensions[i].maxScore).toBe(result.componentScores[i].maxScore);
    }
  });
});

// ── Handler delegation ─────────────────────────────────────────

describe("Handler delegation contract", () => {
  it("criRefreshHandler has correct intent name", async () => {
    const { criRefreshHandler } = await import("@/intelligence/handlers/cri/cri-refresh.handler");
    expect(criRefreshHandler.intentName).toBe("intent.cri_refresh_requested");
    expect(criRefreshHandler.handle).toBeInstanceOf(Function);
  });
});

// ── Missing teacherId ──────────────────────────────────────────

describe("Missing teacherId handling", () => {
  it("assembleCriInputFromRaw handles missing profile gracefully", () => {
    const input = assembleCriInputFromRaw("", emptyRawData);
    expect(input.teacherId).toBe("");
    expect(input.profileSignals.profileCompletenessScore).toBe(0);
  });
});
