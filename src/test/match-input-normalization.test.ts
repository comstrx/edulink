/**
 * Match Input Normalization — Unit Tests
 *
 * Tests the pure normalization functions (no DB access).
 * Phase 5B
 */
import { describe, it, expect } from "vitest";
import {
  assembleMatchInputFromRaw,
  deriveTeacherProfileSignals,
  deriveTeacherQualificationSignals,
  deriveTeacherTrustSignals,
  deriveTeacherTrainingSignals,
  deriveJobRequirementSignals,
} from "@/intelligence/matching/engine/match-engine.inputs";
import type { MatchRawData, MatchRawTeacherProfile, MatchRawJob } from "@/intelligence/matching/engine/match-data-loader";

// ── Fixtures ───────────────────────────────────────────────────

const TEACHER_ID = "t-match-1";
const JOB_ID = "j-match-1";

const fullProfile: MatchRawTeacherProfile = {
  id: TEACHER_ID,
  subject_ids: ["sub-1", "sub-2"],
  curriculum_ids: ["cur-1"],
  grade_band_ids: ["gb-1", "gb-2"],
  language_ids: ["lang-1", "lang-2"],
  years_of_experience: 7,
  country_id: "co-1",
  region_id: "re-1",
  city_id: "ci-1",
  employment_type_term_ids: ["et-1"],
  work_arrangement_term_ids: ["wa-1"],
  visa_status_term_id: "vs-1",
  certification_ids: ["cert-legacy-1"],
  completed_training: [
    { courseId: "c1", skillIds: ["sk-1", "sk-2"] },
    { courseId: "c2" },
  ],
};

const fullJob: MatchRawJob = {
  id: JOB_ID,
  subject_term_ids: ["sub-1", "sub-3"],
  curriculum_term_ids: ["cur-1"],
  grade_band_term_ids: ["gb-1"],
  language_term_ids: ["lang-1"],
  certification_term_ids: ["cert-1"],
  experience_min: 3,
  country_term_id: "co-1",
  region_term_id: "re-1",
  city_term_id: null,
  employment_type_term_ids: ["et-1"],
  work_arrangement_term_ids: ["wa-1"],
  visa_status_term_ids: ["vs-1"],
};

const fullRawData: MatchRawData = {
  teacherProfile: fullProfile,
  teacherQualifications: {
    certificationTermIds: ["cert-1"],
    licenseTermIds: ["lic-1"],
    degreeTermIds: ["deg-1"],
    skillTermIds: ["sk-1", "sk-3"],
  },
  verifiedState: {
    verified_count: 2,
    total_count: 3,
    credentials: [
      { type: "identity", status: "verified" },
      { type: "education", status: "verified" },
      { type: "credential", status: "pending" },
    ],
  },
  job: fullJob,
  jobSkillReqs: [
    { skill_term_id: "sk-1", required_or_preferred: "required" },
    { skill_term_id: "sk-4", required_or_preferred: "preferred" },
  ],
  jobLangReqs: [
    { language_term_id: "lang-1", required_or_preferred: "required" },
  ],
};

const emptyRawData: MatchRawData = {
  teacherProfile: null,
  teacherQualifications: {
    certificationTermIds: [],
    licenseTermIds: [],
    degreeTermIds: [],
    skillTermIds: [],
  },
  verifiedState: null,
  job: null,
  jobSkillReqs: [],
  jobLangReqs: [],
};

// ── Teacher Profile Signals ────────────────────────────────────

describe("deriveTeacherProfileSignals", () => {
  it("normalizes full profile", () => {
    const s = deriveTeacherProfileSignals(fullProfile);
    expect(s.subjectIds).toEqual(["sub-1", "sub-2"]);
    expect(s.yearsOfExperience).toBe(7);
    expect(s.countryId).toBe("co-1");
    expect(s.visaStatusTermId).toBe("vs-1");
  });

  it("defaults safely for null profile", () => {
    const s = deriveTeacherProfileSignals(null);
    expect(s.subjectIds).toEqual([]);
    expect(s.yearsOfExperience).toBe(0);
    expect(s.countryId).toBeNull();
  });
});

// ── Teacher Qualification Signals ──────────────────────────────

describe("deriveTeacherQualificationSignals", () => {
  it("merges relational + legacy cert IDs", () => {
    const s = deriveTeacherQualificationSignals(
      fullRawData.teacherQualifications,
      fullProfile,
    );
    expect(s.certificationIds).toContain("cert-1");
    expect(s.certificationIds).toContain("cert-legacy-1");
    expect(s.skillIds).toEqual(["sk-1", "sk-3"]);
    expect(s.degreeIds).toEqual(["deg-1"]);
  });

  it("handles empty qualifications", () => {
    const s = deriveTeacherQualificationSignals(
      emptyRawData.teacherQualifications,
      null,
    );
    expect(s.certificationIds).toEqual([]);
    expect(s.skillIds).toEqual([]);
  });
});

// ── Trust Signals ──────────────────────────────────────────────

describe("deriveTeacherTrustSignals", () => {
  it("parses verified credentials", () => {
    const s = deriveTeacherTrustSignals(fullRawData.verifiedState);
    expect(s.identityVerified).toBe(true);
    expect(s.educationVerified).toBe(true);
    expect(s.credentialVerified).toBe(false); // pending
    expect(s.totalVerifiedCount).toBe(2);
  });

  it("defaults for null state", () => {
    const s = deriveTeacherTrustSignals(null);
    expect(s.identityVerified).toBe(false);
    expect(s.totalVerifiedCount).toBe(0);
  });
});

// ── Training Signals ───────────────────────────────────────────

describe("deriveTeacherTrainingSignals", () => {
  it("counts training and extracts skill IDs", () => {
    const s = deriveTeacherTrainingSignals(fullProfile);
    expect(s.completedCourseCount).toBe(2);
    expect(s.relevantTrainingTermIds).toContain("sk-1");
    expect(s.relevantTrainingTermIds).toContain("sk-2");
  });

  it("handles null profile", () => {
    const s = deriveTeacherTrainingSignals(null);
    expect(s.completedCourseCount).toBe(0);
    expect(s.relevantTrainingTermIds).toEqual([]);
  });
});

// ── Job Requirement Signals ────────────────────────────────────

describe("deriveJobRequirementSignals", () => {
  it("normalizes full job with skill/lang reqs", () => {
    const s = deriveJobRequirementSignals(
      fullJob,
      fullRawData.jobSkillReqs,
      fullRawData.jobLangReqs,
    );
    expect(s.requiredSubjectIds).toEqual(["sub-1", "sub-3"]);
    expect(s.requiredSkillIds).toEqual(["sk-1"]);
    expect(s.preferredSkillIds).toEqual(["sk-4"]);
    expect(s.requiredLanguageIds).toContain("lang-1");
    expect(s.experienceMin).toBe(3);
    expect(s.countryTermId).toBe("co-1");
  });

  it("defaults for null job", () => {
    const s = deriveJobRequirementSignals(null, [], []);
    expect(s.requiredSubjectIds).toEqual([]);
    expect(s.experienceMin).toBeNull();
  });

  it("handles sparse job (no arrays)", () => {
    const sparseJob: MatchRawJob = {
      id: "j-sparse",
      subject_term_ids: null,
      curriculum_term_ids: null,
      grade_band_term_ids: null,
      language_term_ids: null,
      certification_term_ids: null,
      experience_min: null,
      country_term_id: null,
      region_term_id: null,
      city_term_id: null,
      employment_type_term_ids: null,
      work_arrangement_term_ids: null,
      visa_status_term_ids: null,
    };
    const s = deriveJobRequirementSignals(sparseJob, [], []);
    expect(s.requiredSubjectIds).toEqual([]);
    expect(s.requiredCertificationIds).toEqual([]);
  });
});

// ── Full assembly ──────────────────────────────────────────────

describe("assembleMatchInputFromRaw", () => {
  it("produces valid input for full data", () => {
    const input = assembleMatchInputFromRaw(TEACHER_ID, JOB_ID, fullRawData, {
      triggeredByEvent: "test.event",
    });
    expect(input.teacherId).toBe(TEACHER_ID);
    expect(input.jobId).toBe(JOB_ID);
    expect(input.teacherProfile.subjectIds.length).toBeGreaterThan(0);
    expect(input.teacherQualifications.certificationIds.length).toBeGreaterThan(0);
    expect(input.jobRequirements.requiredSubjectIds.length).toBeGreaterThan(0);
    expect(input.metadata.triggeredByEvent).toBe("test.event");
  });

  it("produces valid input for empty data", () => {
    const input = assembleMatchInputFromRaw(TEACHER_ID, JOB_ID, emptyRawData);
    expect(input.teacherId).toBe(TEACHER_ID);
    expect(input.teacherProfile.subjectIds).toEqual([]);
    expect(input.jobRequirements.requiredSubjectIds).toEqual([]);
    expect(input.metadata.triggeredAt).toBeDefined();
  });

  it("teacher missing certs vs job requiring certs", () => {
    const data: MatchRawData = {
      ...fullRawData,
      teacherQualifications: {
        certificationTermIds: [],
        licenseTermIds: [],
        degreeTermIds: [],
        skillTermIds: [],
      },
    };
    const input = assembleMatchInputFromRaw(TEACHER_ID, JOB_ID, data);
    // Teacher has no certs but legacy cert from profile
    expect(input.teacherQualifications.certificationIds).toEqual(["cert-legacy-1"]);
    // Job still requires cert-1
    expect(input.jobRequirements.requiredCertificationIds).toEqual(["cert-1"]);
  });

  it("teacher with no training history", () => {
    const data: MatchRawData = {
      ...fullRawData,
      teacherProfile: { ...fullProfile, completed_training: null },
    };
    const input = assembleMatchInputFromRaw(TEACHER_ID, JOB_ID, data);
    expect(input.teacherTraining.completedCourseCount).toBe(0);
    expect(input.teacherTraining.relevantTrainingTermIds).toEqual([]);
  });
});
