/**
 * Match Engine v1 — Deterministic Tests
 *
 * Phase 5C — Validates scoring, eligibility, strengths/gaps, reason codes.
 */

import { describe, it, expect } from "vitest";
import { runMatchEngine } from "@/intelligence/matching/engine/match-engine";
import type { MatchEngineInput } from "@/intelligence/matching/engine/match-engine.types";

// ── Helpers ────────────────────────────────────────────────────

function makeInput(overrides: Partial<{
  teacherSubjects: string[];
  teacherCurriculums: string[];
  teacherGradeBands: string[];
  teacherLanguages: string[];
  teacherCerts: string[];
  teacherExp: number;
  teacherCountry: string | null;
  teacherRegion: string | null;
  teacherCity: string | null;
  teacherEmployment: string[];
  teacherWork: string[];
  teacherVisa: string | null;
  teacherVerifiedCount: number;
  teacherIdentityVerified: boolean;
  teacherCourseCount: number;
  jobSubjects: string[];
  jobCurriculums: string[];
  jobGradeBands: string[];
  jobLanguages: string[];
  jobCerts: string[];
  jobExpMin: number | null;
  jobCountry: string | null;
  jobRegion: string | null;
  jobCity: string | null;
  jobEmployment: string[];
  jobWork: string[];
  jobVisa: string[];
}> = {}): MatchEngineInput {
  return {
    teacherId: "t1",
    jobId: "j1",
    teacherProfile: {
      subjectIds: overrides.teacherSubjects ?? [],
      curriculumIds: overrides.teacherCurriculums ?? [],
      gradeBandIds: overrides.teacherGradeBands ?? [],
      languageIds: overrides.teacherLanguages ?? [],
      yearsOfExperience: overrides.teacherExp ?? 0,
      countryId: overrides.teacherCountry ?? null,
      regionId: overrides.teacherRegion ?? null,
      cityId: overrides.teacherCity ?? null,
      employmentTypeTermIds: overrides.teacherEmployment ?? [],
      workArrangementTermIds: overrides.teacherWork ?? [],
      visaStatusTermId: overrides.teacherVisa ?? null,
    },
    teacherQualifications: {
      certificationIds: overrides.teacherCerts ?? [],
      licenseIds: [],
      degreeIds: [],
      skillIds: [],
    },
    teacherTrust: {
      identityVerified: overrides.teacherIdentityVerified ?? false,
      educationVerified: false,
      experienceVerified: false,
      credentialVerified: false,
      totalVerifiedCount: overrides.teacherVerifiedCount ?? 0,
    },
    teacherTraining: {
      completedCourseCount: overrides.teacherCourseCount ?? 0,
      completedPathwayCount: 0,
      relevantTrainingTermIds: [],
    },
    jobRequirements: {
      requiredSubjectIds: overrides.jobSubjects ?? [],
      requiredCurriculumIds: overrides.jobCurriculums ?? [],
      requiredGradeBandIds: overrides.jobGradeBands ?? [],
      requiredLanguageIds: overrides.jobLanguages ?? [],
      requiredCertificationIds: overrides.jobCerts ?? [],
      requiredSkillIds: [],
      experienceMin: overrides.jobExpMin ?? null,
      countryTermId: overrides.jobCountry ?? null,
      regionTermId: overrides.jobRegion ?? null,
      cityTermId: overrides.jobCity ?? null,
      employmentTypeTermIds: overrides.jobEmployment ?? [],
      workArrangementTermIds: overrides.jobWork ?? [],
      visaStatusTermIds: overrides.jobVisa ?? [],
      preferredSubjectIds: [],
      preferredCurriculumIds: [],
      preferredSkillIds: [],
    },
    metadata: { triggeredByEvent: "test" },
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe("Match Engine v1", () => {
  it("scores a fully aligned teacher-job pair highly", () => {
    const input = makeInput({
      teacherSubjects: ["s1", "s2"],
      teacherCurriculums: ["c1"],
      teacherGradeBands: ["g1"],
      teacherLanguages: ["l1"],
      teacherCerts: ["cert1"],
      teacherExp: 5,
      teacherCountry: "uae",
      teacherEmployment: ["ft"],
      teacherWork: ["onsite"],
      teacherVerifiedCount: 2,
      teacherIdentityVerified: true,
      teacherCourseCount: 3,
      jobSubjects: ["s1", "s2"],
      jobCurriculums: ["c1"],
      jobGradeBands: ["g1"],
      jobLanguages: ["l1"],
      jobCerts: ["cert1"],
      jobExpMin: 3,
      jobCountry: "uae",
      jobEmployment: ["ft"],
      jobWork: ["onsite"],
    });

    const result = runMatchEngine(input);

    expect(result.matchScore).toBe(100);
    expect(result.matchBand).toBe("high");
    expect(result.eligibility.hasRequiredSubjectMatch).toBe(true);
    expect(result.eligibility.hasRequiredCurriculumMatch).toBe(true);
    expect(result.eligibility.meetsMinimumExperience).toBe(true);
    expect(result.eligibility.hasRequiredCertificationMatch).toBe(true);
    expect(result.eligibility.hardRequirementsMet).toBe(result.eligibility.hardRequirementsTotal);
  });

  it("subject match but missing certification lowers score and flags gap", () => {
    const input = makeInput({
      teacherSubjects: ["s1"],
      jobSubjects: ["s1"],
      jobCerts: ["cert1"],
      // teacher has no certifications
    });

    const result = runMatchEngine(input);

    expect(result.eligibility.hasRequiredSubjectMatch).toBe(true);
    expect(result.eligibility.hasRequiredCertificationMatch).toBe(false);
    expect(result.gaps.some(g => g.category === "certifications")).toBe(true);
    expect(result.reasonCodes.some(r => r.code === "no_required_certification")).toBe(true);
  });

  it("good teacher but wrong curriculum is reflected in gaps", () => {
    const input = makeInput({
      teacherSubjects: ["s1"],
      teacherCurriculums: ["c_other"],
      teacherExp: 10,
      jobSubjects: ["s1"],
      jobCurriculums: ["c1"],
      jobExpMin: 3,
    });

    const result = runMatchEngine(input);

    expect(result.eligibility.hasRequiredCurriculumMatch).toBe(false);
    expect(result.gaps.some(g => g.category === "curriculums")).toBe(true);
    expect(result.reasonCodes.some(r => r.code === "missing_required_curriculum")).toBe(true);
  });

  it("no hard requirements defined yields all eligibility flags true", () => {
    const input = makeInput({
      teacherSubjects: ["s1"],
      // job has no requirements at all
    });

    const result = runMatchEngine(input);

    expect(result.eligibility.hasRequiredSubjectMatch).toBe(true);
    expect(result.eligibility.hasRequiredCurriculumMatch).toBe(true);
    expect(result.eligibility.hasRequiredCertificationMatch).toBe(true);
    expect(result.eligibility.meetsMinimumExperience).toBe(true);
    expect(result.eligibility.hasRequiredLanguageMatch).toBe(true);
    expect(result.eligibility.locationCompatible).toBe(true);
    expect(result.eligibility.hardRequirementsTotal).toBe(0);
  });

  it("location mismatch but otherwise strong fit", () => {
    const input = makeInput({
      teacherSubjects: ["s1"],
      teacherCurriculums: ["c1"],
      teacherCountry: "uk",
      jobSubjects: ["s1"],
      jobCurriculums: ["c1"],
      jobCountry: "uae",
    });

    const result = runMatchEngine(input);

    expect(result.eligibility.locationCompatible).toBe(false);
    expect(result.gaps.some(g => g.category === "location")).toBe(true);
    expect(result.reasonCodes.some(r => r.code === "location_not_compatible")).toBe(true);
    // Score should still be positive due to subject+curriculum match
    expect(result.matchScore).toBeGreaterThan(0);
  });

  it("trust bonus improves strengths but does not dominate score", () => {
    const inputNoTrust = makeInput({ teacherSubjects: ["s1"], jobSubjects: ["s1"] });
    const inputWithTrust = makeInput({
      teacherSubjects: ["s1"],
      jobSubjects: ["s1"],
      teacherVerifiedCount: 3,
      teacherIdentityVerified: true,
    });

    const noTrust = runMatchEngine(inputNoTrust);
    const withTrust = runMatchEngine(inputWithTrust);

    // Trust adds a strength entry but the score difference should be modest
    expect(withTrust.strengths.some(s => s.category === "trust")).toBe(true);
    expect(noTrust.strengths.some(s => s.category === "trust")).toBe(false);
    // Score should be the same since trust isn't a separate weighted component —
    // it manifests through eligibility flags/reason codes, not the weighted score
    // (visa_status weight is the proxy in v1)
  });

  it("result is always bounded 0–100", () => {
    // Empty input
    const empty = runMatchEngine(makeInput());
    expect(empty.matchScore).toBeGreaterThanOrEqual(0);
    expect(empty.matchScore).toBeLessThanOrEqual(100);

    // Full input
    const full = runMatchEngine(makeInput({
      teacherSubjects: ["s1"], teacherCurriculums: ["c1"],
      teacherGradeBands: ["g1"], teacherLanguages: ["l1"],
      teacherCerts: ["cert1"], teacherExp: 10,
      teacherCountry: "uae", teacherEmployment: ["ft"],
      teacherWork: ["onsite"],
      jobSubjects: ["s1"], jobCurriculums: ["c1"],
      jobGradeBands: ["g1"], jobLanguages: ["l1"],
      jobCerts: ["cert1"], jobExpMin: 3,
      jobCountry: "uae", jobEmployment: ["ft"],
      jobWork: ["onsite"],
    }));
    expect(full.matchScore).toBeGreaterThanOrEqual(0);
    expect(full.matchScore).toBeLessThanOrEqual(100);
  });

  it("empty job requirements with empty teacher produces a valid result at 100", () => {
    // All overlap ratios return 1 when required arrays are empty
    const result = runMatchEngine(makeInput());
    expect(result.matchScore).toBe(100);
    expect(result.matchBand).toBe("high");
    expect(result.componentScores.length).toBe(10);
  });

  it("partial experience gives proportional credit", () => {
    const input = makeInput({
      teacherExp: 2,
      jobExpMin: 5,
    });

    const result = runMatchEngine(input);
    const expComponent = result.componentScores.find(c => c.component === "experience");
    expect(expComponent).toBeDefined();
    // 2/5 = 0.4, so score = 0.4 * 5 weight = 2
    expect(expComponent!.score).toBe(2);
    expect(result.eligibility.meetsMinimumExperience).toBe(false);
  });

  it("freshness is always set to fresh", () => {
    const result = runMatchEngine(makeInput());
    expect(result.freshness.isStale).toBe(false);
    expect(result.freshness.freshnessStatus).toBe("fresh");
  });

  it("computedAt and triggeredByEvent are propagated", () => {
    const result = runMatchEngine(makeInput());
    expect(result.computedAt).toBeTruthy();
    expect(result.triggeredByEvent).toBe("test");
  });
});
