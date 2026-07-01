/**
 * CRI Engine v1 — Deterministic Scoring Tests
 *
 * Phase 4C
 */
import { describe, it, expect } from "vitest";
import { runCriEngine } from "@/intelligence/cri/engine/cri-engine";
import type { CriEngineInput } from "@/intelligence/cri/engine/cri-engine.types";

const baseMeta = {
  computedForTeacherId: "t-1",
  triggeredByEvent: "test",
  triggeredAt: "2026-03-11T00:00:00Z",
};

function makeInput(overrides: Partial<CriEngineInput> = {}): CriEngineInput {
  return {
    teacherId: "t-1",
    profileSignals: {
      hasHeadline: false,
      hasBio: false,
      hasSubjectMappings: false,
      hasCurriculumMappings: false,
      hasExperienceEntries: false,
      hasEducationEntries: false,
      hasLanguageEntries: false,
      profileCompletenessScore: 0,
    },
    trainingSignals: { completedCourseCount: 0 },
    trustSignals: {
      identityVerified: false,
      educationVerified: false,
      experienceVerified: false,
      credentialVerified: false,
      totalVerifiedCount: 0,
    },
    hiringSignals: {},
    metadata: baseMeta,
    ...overrides,
  };
}

// ── Scenario 1: Strong verified teacher ────────────────────────

describe("Strong verified teacher with training", () => {
  const input = makeInput({
    profileSignals: {
      hasHeadline: true,
      hasBio: true,
      hasSubjectMappings: true,
      hasCurriculumMappings: true,
      hasExperienceEntries: true,
      hasEducationEntries: true,
      hasLanguageEntries: true,
      profileCompletenessScore: 100,
    },
    trainingSignals: {
      completedCourseCount: 8,
      recentCompletionCount: 3,
      completedPathwayCount: 1,
    },
    trustSignals: {
      identityVerified: true,
      educationVerified: true,
      experienceVerified: true,
      credentialVerified: true,
      totalVerifiedCount: 4,
    },
    hiringSignals: {
      applicationsCount: 5,
      shortlistedCount: 2,
      interviewsCount: 1,
      rejectionsCount: 0,
    },
  });

  const result = runCriEngine(input);

  it("scores highly ready", () => {
    expect(result.criScore).toBeGreaterThanOrEqual(80);
    expect(result.criBand).toBe("highly_ready");
  });

  it("has all 4 component scores", () => {
    expect(result.componentScores).toHaveLength(4);
    // Profile, training, verification should be met; hiring may vary
    const metComponents = result.componentScores.filter((c) => c.met);
    expect(metComponents.length).toBeGreaterThanOrEqual(3);
  });

  it("includes positive reason codes", () => {
    const codes = result.reasonCodes.map((r) => r.code);
    expect(codes).toContain("strong_profile_foundation");
    expect(codes).toContain("strong_training_signal");
  });
});

// ── Scenario 2: Weak incomplete teacher ────────────────────────

describe("Weak incomplete teacher", () => {
  const input = makeInput(); // all defaults = empty

  const result = runCriEngine(input);

  it("scores not ready", () => {
    expect(result.criScore).toBeLessThan(40);
    expect(result.criBand).toBe("not_ready");
  });

  it("includes negative reason codes", () => {
    const codes = result.reasonCodes.map((r) => r.code);
    expect(codes).toContain("profile_incomplete");
    expect(codes).toContain("no_training_completed");
    expect(codes).toContain("no_verified_credentials");
  });

  it("hiring baseline does not zero score", () => {
    // With no hiring history, baseline should give some hiring points
    const hiringComp = result.componentScores.find((c) => c.component === "hiring_signals");
    expect(hiringComp!.score).toBeGreaterThan(0);
  });
});

// ── Scenario 3: Teacher with no hiring history ─────────────────

describe("Teacher with no hiring history", () => {
  const input = makeInput({
    profileSignals: {
      hasHeadline: true,
      hasBio: true,
      hasSubjectMappings: true,
      hasCurriculumMappings: false,
      hasExperienceEntries: true,
      hasEducationEntries: true,
      hasLanguageEntries: false,
      profileCompletenessScore: 60,
    },
    trainingSignals: { completedCourseCount: 3 },
    hiringSignals: { applicationsCount: 0 },
  });

  const result = runCriEngine(input);

  it("does not collapse score due to no hiring", () => {
    expect(result.criScore).toBeGreaterThanOrEqual(20);
  });

  it("has no_hiring_signal_yet reason", () => {
    expect(result.reasonCodes.map((r) => r.code)).toContain("no_hiring_signal_yet");
  });
});

// ── Scenario 4: Missing optional signals ───────────────────────

describe("Missing optional signals", () => {
  const input = makeInput({
    trainingSignals: { completedCourseCount: 2 },
    hiringSignals: {},
  });

  const result = runCriEngine(input);

  it("produces valid output", () => {
    expect(result.criScore).toBeGreaterThanOrEqual(0);
    expect(result.criScore).toBeLessThanOrEqual(100);
    expect(result.componentScores).toHaveLength(4);
  });
});

// ── Scenario 5: Reason codes consistency ───────────────────────

describe("Reason codes consistency", () => {
  it("every reason code has required fields", () => {
    const input = makeInput({
      profileSignals: {
        hasHeadline: true, hasBio: false, hasSubjectMappings: true,
        hasCurriculumMappings: true, hasExperienceEntries: false,
        hasEducationEntries: true, hasLanguageEntries: true,
        profileCompletenessScore: 70,
      },
      trustSignals: {
        identityVerified: true, educationVerified: false,
        experienceVerified: false, credentialVerified: false,
        totalVerifiedCount: 1,
      },
    });
    const result = runCriEngine(input);
    for (const rc of result.reasonCodes) {
      expect(rc.code).toBeTruthy();
      expect(["positive", "negative"]).toContain(rc.polarity);
      expect(rc.message).toBeTruthy();
    }
  });
});

// ── Scenario 6: Score always within 0–100 ──────────────────────

describe("Score bounds", () => {
  it("maximum input does not exceed 100", () => {
    const input = makeInput({
      profileSignals: {
        hasHeadline: true, hasBio: true, hasSubjectMappings: true,
        hasCurriculumMappings: true, hasExperienceEntries: true,
        hasEducationEntries: true, hasLanguageEntries: true,
        profileCompletenessScore: 100,
      },
      trainingSignals: { completedCourseCount: 50, recentCompletionCount: 20, completedPathwayCount: 5 },
      trustSignals: {
        identityVerified: true, educationVerified: true,
        experienceVerified: true, credentialVerified: true,
        totalVerifiedCount: 10,
      },
      hiringSignals: { applicationsCount: 100, shortlistedCount: 50, interviewsCount: 20, rejectionsCount: 0 },
    });
    const result = runCriEngine(input);
    expect(result.criScore).toBeLessThanOrEqual(100);
    expect(result.criScore).toBeGreaterThanOrEqual(0);
  });

  it("minimum input does not go below 0", () => {
    const result = runCriEngine(makeInput());
    expect(result.criScore).toBeGreaterThanOrEqual(0);
  });
});
