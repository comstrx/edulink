/**
 * Gap Input Normalization Tests
 *
 * Phase 6B — Validates signal derivation from raw data to GapEngineInput.
 */

import { describe, it, expect } from "vitest";
import {
  assembleGapInputFromRaw,
  deriveProfileGapSignals,
  deriveQualificationGapSignals,
  deriveTrustGapSignals,
  deriveTrainingGapSignals,
  deriveHiringGapSignals,
  deriveMatchGapSignals,
} from "@/intelligence/gaps/engine/gap-engine.inputs";
import type { GapRawData, GapRawTeacherProfile } from "@/intelligence/gaps/engine/gap-data-loader";

// ── Helpers ────────────────────────────────────────────────────

function makeProfile(overrides: Partial<GapRawTeacherProfile> = {}): GapRawTeacherProfile {
  return {
    id: "t1",
    full_name: overrides.full_name ?? null,
    bio: overrides.bio ?? null,
    avatar_url: overrides.avatar_url ?? null,
    contact_email: overrides.contact_email ?? null,
    cv_url: overrides.cv_url ?? null,
    country_id: overrides.country_id ?? null,
    city_id: overrides.city_id ?? null,
    region_id: overrides.region_id ?? null,
    subject_ids: overrides.subject_ids ?? null,
    curriculum_ids: overrides.curriculum_ids ?? null,
    certification_ids: overrides.certification_ids ?? null,
    language_ids: overrides.language_ids ?? null,
    grade_band_ids: overrides.grade_band_ids ?? null,
    years_of_experience: overrides.years_of_experience ?? null,
    education: overrides.education ?? null,
    experience: overrides.experience ?? null,
    completed_training: overrides.completed_training ?? null,
  };
}

function makeRawData(overrides: Partial<GapRawData> = {}): GapRawData {
  return {
    teacherProfile: overrides.teacherProfile ?? makeProfile(),
    certificationTermIds: overrides.certificationTermIds ?? [],
    licenseTermIds: overrides.licenseTermIds ?? [],
    degreeTermIds: overrides.degreeTermIds ?? [],
    skillTermIds: overrides.skillTermIds ?? [],
    verifiedState: overrides.verifiedState ?? null,
    applicationHistory: overrides.applicationHistory ?? {
      totalApplications: 0,
      totalRejections: 0,
      totalShortlists: 0,
      totalInterviews: 0,
    },
    recentMatchSnapshots: overrides.recentMatchSnapshots ?? [],
  };
}

// ── Profile Signal Tests ───────────────────────────────────────

describe("Gap Input — Profile Signals", () => {
  it("null profile produces all-missing signals", () => {
    const signals = deriveProfileGapSignals(null);
    expect(signals.missingBio).toBe(true);
    expect(signals.missingSubjectMappings).toBe(true);
    expect(signals.profileCompletenessScore).toBe(0);
  });

  it("complete profile produces no-missing signals", () => {
    const signals = deriveProfileGapSignals(makeProfile({
      full_name: "John",
      bio: "A teacher",
      avatar_url: "http://img",
      contact_email: "j@x.com",
      cv_url: "http://cv",
      country_id: "uae",
      subject_ids: ["s1"],
      curriculum_ids: ["c1"],
      grade_band_ids: ["g1"],
      language_ids: ["l1"],
      education: [{ school: "MIT" }],
      experience: [{ role: "Teacher" }],
    }));

    expect(signals.missingBio).toBe(false);
    expect(signals.missingSubjectMappings).toBe(false);
    expect(signals.missingLocation).toBe(false);
    expect(signals.profileCompletenessScore).toBe(100);
  });

  it("partial profile gives proportional completeness", () => {
    const signals = deriveProfileGapSignals(makeProfile({
      full_name: "Jane",
      bio: "Bio here",
      subject_ids: ["s1"],
    }));

    expect(signals.missingHeadline).toBe(false);
    expect(signals.missingBio).toBe(false);
    expect(signals.missingSubjectMappings).toBe(false);
    expect(signals.missingAvatar).toBe(true);
    expect(signals.profileCompletenessScore).toBe(25); // 3/12 = 25%
  });
});

// ── Qualification Signal Tests ─────────────────────────────────

describe("Gap Input — Qualification Signals", () => {
  it("merges relational and legacy certification IDs", () => {
    const signals = deriveQualificationGapSignals(makeRawData({
      teacherProfile: makeProfile({ certification_ids: ["c1"] }),
      certificationTermIds: ["c2"],
    }));

    expect(signals.certificationIds).toContain("c1");
    expect(signals.certificationIds).toContain("c2");
    expect(signals.certificationIds.length).toBe(2);
  });

  it("deduplicates certification IDs", () => {
    const signals = deriveQualificationGapSignals(makeRawData({
      teacherProfile: makeProfile({ certification_ids: ["c1"] }),
      certificationTermIds: ["c1"],
    }));
    expect(signals.certificationIds.length).toBe(1);
  });
});

// ── Trust Signal Tests ─────────────────────────────────────────

describe("Gap Input — Trust Signals", () => {
  it("null verified state produces all-unverified", () => {
    const signals = deriveTrustGapSignals(null);
    expect(signals.identityVerified).toBe(false);
    expect(signals.missingVerificationTypes).toEqual(["identity", "education", "experience", "credential"]);
  });

  it("partial verification produces correct missing types", () => {
    const signals = deriveTrustGapSignals({
      verified_count: 1,
      total_count: 4,
      overall_status: "partial",
      credentials: [
        { type: "identity", status: "verified" },
        { type: "education", status: "pending" },
      ],
    });

    expect(signals.identityVerified).toBe(true);
    expect(signals.educationVerified).toBe(false);
    expect(signals.missingVerificationTypes).toContain("education");
    expect(signals.missingVerificationTypes).not.toContain("identity");
  });
});

// ── Training Signal Tests ──────────────────────────────────────

describe("Gap Input — Training Signals", () => {
  it("no training produces hasNoTraining = true", () => {
    const signals = deriveTrainingGapSignals(makeProfile());
    expect(signals.hasNoTraining).toBe(true);
    expect(signals.completedCourseCount).toBe(0);
  });

  it("training with skill IDs extracts relevant term IDs", () => {
    const signals = deriveTrainingGapSignals(makeProfile({
      completed_training: [
        { courseId: "tr1", skillIds: ["sk1", "sk2"] },
        { courseId: "tr2", skillIds: ["sk2", "sk3"] },
      ],
    }));
    expect(signals.completedCourseCount).toBe(2);
    expect(signals.hasNoTraining).toBe(false);
    expect(signals.relevantTrainingTermIds).toEqual(expect.arrayContaining(["sk1", "sk2", "sk3"]));
    expect(signals.relevantTrainingTermIds.length).toBe(3); // deduplicated
  });
});

// ── Hiring Signal Tests ────────────────────────────────────────

describe("Gap Input — Hiring Signals", () => {
  it("no hiring history produces zero counts, not gaps", () => {
    const signals = deriveHiringGapSignals({
      totalApplications: 0,
      totalRejections: 0,
      totalShortlists: 0,
      totalInterviews: 0,
    });

    expect(signals.totalApplications).toBe(0);
    expect(signals.totalRejections).toBe(0);
    expect(signals.rejectionReasonIds).toEqual([]);
  });

  it("hiring history with rejections passes through counts", () => {
    const signals = deriveHiringGapSignals({
      totalApplications: 5,
      totalRejections: 3,
      totalShortlists: 1,
      totalInterviews: 1,
    });

    expect(signals.totalApplications).toBe(5);
    expect(signals.totalRejections).toBe(3);
  });
});

// ── Match Gap Signal Tests ─────────────────────────────────────

describe("Gap Input — Match Gap Signals", () => {
  it("no match snapshots produces empty signals", () => {
    const signals = deriveMatchGapSignals([]);
    expect(signals.recentMatchGapTermIds).toEqual([]);
    expect(signals.insufficientExperience).toBe(false);
    expect(signals.locationMismatchCount).toBe(0);
  });

  it("match snapshots aggregate unmatched term IDs", () => {
    const signals = deriveMatchGapSignals([
      { job_id: "j1", score: 50, unmatched_term_ids: ["t1", "t2"], dimensions: [] },
      { job_id: "j2", score: 40, unmatched_term_ids: ["t2", "t3"], dimensions: [] },
    ]);

    expect(signals.recentMatchGapTermIds).toEqual(expect.arrayContaining(["t1", "t2", "t3"]));
    expect(signals.recentMatchGapTermIds.length).toBe(3);
  });

  it("detects location mismatches from dimensions", () => {
    const signals = deriveMatchGapSignals([
      {
        job_id: "j1",
        score: 60,
        unmatched_term_ids: [],
        dimensions: [
          { dimension: "location", matched: false },
          { dimension: "subjects", matched: true },
        ],
      },
    ]);

    expect(signals.locationMismatchCount).toBe(1);
  });

  it("detects experience gaps from dimensions", () => {
    const signals = deriveMatchGapSignals([
      {
        job_id: "j1",
        score: 55,
        unmatched_term_ids: [],
        dimensions: [{ dimension: "experience", matched: false }],
      },
    ]);

    expect(signals.insufficientExperience).toBe(true);
  });
});

// ── Full Assembly Tests ────────────────────────────────────────

describe("Gap Input — Full Assembly", () => {
  it("assembles valid GapEngineInput from raw data", () => {
    const input = assembleGapInputFromRaw("t1", makeRawData());
    expect(input.teacherId).toBe("t1");
    expect(input.profileGapSignals).toBeDefined();
    expect(input.qualificationGapSignals).toBeDefined();
    expect(input.trustGapSignals).toBeDefined();
    expect(input.trainingGapSignals).toBeDefined();
    expect(input.hiringGapSignals).toBeDefined();
    expect(input.matchGapSignals).toBeDefined();
    expect(input.metadata).toBeDefined();
  });

  it("teacher with strong profile but match gaps", () => {
    const input = assembleGapInputFromRaw("t1", makeRawData({
      teacherProfile: makeProfile({
        full_name: "Jane",
        bio: "Great teacher",
        avatar_url: "http://img",
        contact_email: "j@x.com",
        cv_url: "http://cv",
        country_id: "uae",
        subject_ids: ["s1"],
        curriculum_ids: ["c1"],
        grade_band_ids: ["g1"],
        language_ids: ["l1"],
        education: [{ school: "MIT" }],
        experience: [{ role: "Teacher" }],
      }),
      recentMatchSnapshots: [
        { job_id: "j1", score: 45, unmatched_term_ids: ["miss1"], dimensions: [] },
      ],
    }));

    expect(input.profileGapSignals.profileCompletenessScore).toBe(100);
    expect(input.matchGapSignals.recentMatchGapTermIds).toContain("miss1");
  });

  it("propagates metadata", () => {
    const input = assembleGapInputFromRaw("t1", makeRawData(), {
      triggeredByEvent: "test.event",
      triggeredAt: "2026-01-01T00:00:00Z",
    });

    expect(input.metadata.triggeredByEvent).toBe("test.event");
    expect(input.metadata.triggeredAt).toBe("2026-01-01T00:00:00Z");
  });
});
