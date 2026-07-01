/**
 * CRI Input Normalization — Unit Tests
 *
 * Tests the pure normalization functions (no DB access).
 * Phase 4B
 */
import { describe, it, expect } from "vitest";
import {
  assembleCriInputFromRaw,
  deriveProfileSignals,
  deriveTrainingSignals,
  deriveTrustSignals,
  deriveHiringSignals,
} from "@/intelligence/cri/engine/cri-engine.inputs";
import type { CriRawData, CriRawProfile, CriRawCounts, CriRawVerifiedState, CriRawHiringAggregates } from "@/intelligence/cri/engine/cri-data-loader";

// ── Fixtures ───────────────────────────────────────────────────

const TEACHER_ID = "teacher-001";

const fullProfile: CriRawProfile = {
  id: TEACHER_ID,
  full_name: "Jane Doe",
  bio: "Experienced math teacher",
  avatar_url: "https://example.com/avatar.jpg",
  cv_url: "https://example.com/cv.pdf",
  subject_ids: ["sub-1", "sub-2"],
  curriculum_ids: ["cur-1"],
  grade_band_ids: ["gb-1"],
  years_of_experience: 8,
  country_id: "country-1",
  region_id: "region-1",
  city_id: "city-1",
  completed_training: [
    { courseId: "c1", completedAt: new Date().toISOString() },
    { courseId: "c2", completedAt: "2024-01-01T00:00:00Z" },
  ],
  education: [{ degree: "MSc" }],
  experience: [{ school: "ABC School", years: 3 }],
};

const fullCounts: CriRawCounts = {
  skillCount: 5,
  certificationCount: 2,
  degreeCount: 1,
  languageCount: 3,
};

const fullVerified: CriRawVerifiedState = {
  verified_count: 3,
  total_count: 4,
  overall_status: "partial",
  credentials: [
    { type: "identity", status: "verified" },
    { type: "education", status: "verified" },
    { type: "credential", status: "verified" },
    { type: "employment", status: "pending" },
  ],
};

const fullHiring: CriRawHiringAggregates = {
  applicationsCount: 10,
  shortlistedCount: 3,
  rejectionsCount: 2,
  interviewsCount: 1,
};

const defaultGrowth = { completedCourseCount: 0, completedPathwayCount: 0, verifiedCompletionCount: 0, recentCompletionCount: 0, criBoostTotal: 0, approvedEvidenceCount: 0, mentorApprovedCount: 0, activePathwayProgressPercent: 0, earnedCredentialCount: 0 };

const fullRawData: CriRawData = {
  profile: fullProfile,
  counts: fullCounts,
  verifiedState: fullVerified,
  hiring: fullHiring,
  trainingGrowth: defaultGrowth,
};

const emptyRawData: CriRawData = {
  profile: null,
  counts: { skillCount: 0, certificationCount: 0, degreeCount: 0, languageCount: 0 },
  verifiedState: null,
  hiring: { applicationsCount: 0, shortlistedCount: 0, rejectionsCount: 0, interviewsCount: 0 },
  trainingGrowth: defaultGrowth,
};

// ── Tests ──────────────────────────────────────────────────────

describe("deriveProfileSignals", () => {
  it("returns all true for a complete profile", () => {
    const signals = deriveProfileSignals(fullProfile, fullCounts);
    expect(signals.hasHeadline).toBe(true);
    expect(signals.hasBio).toBe(true);
    expect(signals.hasSubjectMappings).toBe(true);
    expect(signals.hasCurriculumMappings).toBe(true);
    expect(signals.hasExperienceEntries).toBe(true);
    expect(signals.hasEducationEntries).toBe(true);
    expect(signals.hasLanguageEntries).toBe(true);
    expect(signals.profileCompletenessScore).toBe(100);
  });

  it("returns all false for null profile", () => {
    const signals = deriveProfileSignals(null, { skillCount: 0, certificationCount: 0, degreeCount: 0, languageCount: 0 });
    expect(signals.profileCompletenessScore).toBe(0);
    expect(signals.hasHeadline).toBe(false);
    expect(signals.hasBio).toBe(false);
  });

  it("handles partial profile correctly", () => {
    const partial: CriRawProfile = {
      ...fullProfile,
      bio: null,
      avatar_url: null,
      subject_ids: [],
      experience: [],
    };
    const signals = deriveProfileSignals(partial, { ...fullCounts, skillCount: 0 });
    expect(signals.hasBio).toBe(false);
    expect(signals.hasSubjectMappings).toBe(false);
    expect(signals.hasExperienceEntries).toBe(false);
    // headline, curriculum, education, language, location = 5/10
    expect(signals.profileCompletenessScore).toBe(50);
  });
});

describe("deriveTrainingSignals", () => {
  it("counts completed training", () => {
    const signals = deriveTrainingSignals(fullProfile);
    expect(signals.completedCourseCount).toBe(2);
    expect(signals.recentCompletionCount).toBeGreaterThanOrEqual(1);
  });

  it("handles null profile", () => {
    const signals = deriveTrainingSignals(null);
    expect(signals.completedCourseCount).toBe(0);
  });

  it("handles profile with no completed_training", () => {
    const signals = deriveTrainingSignals({ ...fullProfile, completed_training: null });
    expect(signals.completedCourseCount).toBe(0);
  });
});

describe("deriveTrustSignals", () => {
  it("parses verified credentials", () => {
    const signals = deriveTrustSignals(fullVerified);
    expect(signals.identityVerified).toBe(true);
    expect(signals.educationVerified).toBe(true);
    expect(signals.credentialVerified).toBe(true);
    expect(signals.experienceVerified).toBe(false); // employment is pending
    expect(signals.totalVerifiedCount).toBe(3);
  });

  it("returns all false for null state", () => {
    const signals = deriveTrustSignals(null);
    expect(signals.identityVerified).toBe(false);
    expect(signals.totalVerifiedCount).toBe(0);
  });

  it("handles partial trust data", () => {
    const partial: CriRawVerifiedState = {
      verified_count: 1,
      total_count: 2,
      overall_status: "partial",
      credentials: [{ type: "identity", status: "verified" }],
    };
    const signals = deriveTrustSignals(partial);
    expect(signals.identityVerified).toBe(true);
    expect(signals.educationVerified).toBe(false);
    expect(signals.totalVerifiedCount).toBe(1);
  });
});

describe("deriveHiringSignals", () => {
  it("passes through hiring aggregates", () => {
    const signals = deriveHiringSignals(fullHiring);
    expect(signals.applicationsCount).toBe(10);
    expect(signals.shortlistedCount).toBe(3);
    expect(signals.rejectionsCount).toBe(2);
    expect(signals.interviewsCount).toBe(1);
  });

  it("handles zero hiring history", () => {
    const signals = deriveHiringSignals({ applicationsCount: 0, shortlistedCount: 0, rejectionsCount: 0, interviewsCount: 0 });
    expect(signals.applicationsCount).toBe(0);
  });
});

describe("assembleCriInputFromRaw", () => {
  it("produces valid CriEngineInput for complete data", () => {
    const input = assembleCriInputFromRaw(TEACHER_ID, fullRawData, {
      triggeredByEvent: "test.event",
    });
    expect(input.teacherId).toBe(TEACHER_ID);
    expect(input.profileSignals.profileCompletenessScore).toBe(100);
    expect(input.trainingSignals.completedCourseCount).toBe(2);
    expect(input.trustSignals.totalVerifiedCount).toBe(3);
    expect(input.hiringSignals.applicationsCount).toBe(10);
    expect(input.metadata.computedForTeacherId).toBe(TEACHER_ID);
    expect(input.metadata.triggeredByEvent).toBe("test.event");
  });

  it("produces valid CriEngineInput for empty data", () => {
    const input = assembleCriInputFromRaw(TEACHER_ID, emptyRawData);
    expect(input.teacherId).toBe(TEACHER_ID);
    expect(input.profileSignals.profileCompletenessScore).toBe(0);
    expect(input.trainingSignals.completedCourseCount).toBe(0);
    expect(input.trustSignals.totalVerifiedCount).toBe(0);
    expect(input.hiringSignals.applicationsCount).toBe(0);
    expect(input.metadata.triggeredAt).toBeDefined();
  });

  it("produces valid CriEngineInput for partial profile", () => {
    const partialData: CriRawData = {
      ...fullRawData,
      profile: { ...fullProfile, bio: null, avatar_url: null },
      verifiedState: null,
      hiring: { applicationsCount: 0, shortlistedCount: 0, rejectionsCount: 0, interviewsCount: 0 },
    };
    const input = assembleCriInputFromRaw(TEACHER_ID, partialData);
    expect(input.profileSignals.hasBio).toBe(false);
    expect(input.trustSignals.identityVerified).toBe(false);
    expect(input.hiringSignals.applicationsCount).toBe(0);
    // Should still be a valid object
    expect(input.teacherId).toBe(TEACHER_ID);
  });
});
