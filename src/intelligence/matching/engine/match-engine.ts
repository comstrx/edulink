/**
 * Match Engine v1 — Core Engine
 *
 * Pure computation function: MatchEngineInput → MatchEngineResult.
 *
 * Constraints:
 *  - No database access
 *  - No side-effects
 *  - Deterministic for identical inputs
 *
 * Phase 5C — Live scoring
 */

import type {
  MatchEngineInput,
  MatchEngineResult,
  MatchComponentScore,
  MatchEligibilityFlags,
  MatchReasonCode,
  MatchSignalEntry,
} from "./match-engine.types";
import {
  resolveMatchBand,
  MATCH_COMPONENT_WEIGHTS,
  HARD_REQUIREMENT_COMPONENTS,
  clampMatchScore,
  overlapRatio,
} from "./match-engine.rules";

// ── Component Scorers ──────────────────────────────────────────

function scoreSubjects(input: MatchEngineInput): number {
  return overlapRatio(input.teacherProfile.subjectIds, input.jobRequirements.requiredSubjectIds);
}

function scoreCurriculums(input: MatchEngineInput): number {
  return overlapRatio(input.teacherProfile.curriculumIds, input.jobRequirements.requiredCurriculumIds);
}

function scoreGradeBands(input: MatchEngineInput): number {
  return overlapRatio(input.teacherProfile.gradeBandIds, input.jobRequirements.requiredGradeBandIds);
}

function scoreLocation(input: MatchEngineInput): number {
  const job = input.jobRequirements;
  const teacher = input.teacherProfile;

  // No location requirement = automatic pass
  if (!job.countryTermId && !job.regionTermId && !job.cityTermId) return 1;

  let score = 0;
  let factors = 0;

  if (job.countryTermId) {
    factors++;
    if (teacher.countryId === job.countryTermId) score++;
  }
  if (job.regionTermId) {
    factors++;
    if (teacher.regionId === job.regionTermId) score++;
  }
  if (job.cityTermId) {
    factors++;
    if (teacher.cityId === job.cityTermId) score++;
  }

  return factors > 0 ? score / factors : 1;
}

function scoreEmploymentType(input: MatchEngineInput): number {
  return overlapRatio(input.teacherProfile.employmentTypeTermIds, input.jobRequirements.employmentTypeTermIds);
}

function scoreWorkArrangement(input: MatchEngineInput): number {
  return overlapRatio(input.teacherProfile.workArrangementTermIds, input.jobRequirements.workArrangementTermIds);
}

function scoreLanguages(input: MatchEngineInput): number {
  return overlapRatio(input.teacherProfile.languageIds, input.jobRequirements.requiredLanguageIds);
}

function scoreVisaStatus(input: MatchEngineInput): number {
  const jobVisa = input.jobRequirements.visaStatusTermIds;
  if (jobVisa.length === 0) return 1;
  const teacherVisa = input.teacherProfile.visaStatusTermId;
  if (!teacherVisa) return 0;
  return jobVisa.includes(teacherVisa) ? 1 : 0;
}

function scoreCertifications(input: MatchEngineInput): number {
  return overlapRatio(input.teacherQualifications.certificationIds, input.jobRequirements.requiredCertificationIds);
}

function scoreExperience(input: MatchEngineInput): number {
  const minExp = input.jobRequirements.experienceMin;
  if (minExp == null || minExp <= 0) return 1;
  const teacherExp = input.teacherProfile.yearsOfExperience;
  if (teacherExp >= minExp) return 1;
  // Partial credit for close experience
  return clampMatchScore(teacherExp / minExp, 1);
}

// ── Component scoring map ──────────────────────────────────────

type ComponentKey = keyof typeof MATCH_COMPONENT_WEIGHTS;

const COMPONENT_SCORERS: Record<ComponentKey, (input: MatchEngineInput) => number> = {
  subjects: scoreSubjects,
  curriculums: scoreCurriculums,
  grade_bands: scoreGradeBands,
  location: scoreLocation,
  employment_type: scoreEmploymentType,
  work_arrangement: scoreWorkArrangement,
  languages: scoreLanguages,
  visa_status: scoreVisaStatus,
  certifications: scoreCertifications,
  experience: scoreExperience,
};

const COMPONENT_LABELS: Record<ComponentKey, string> = {
  subjects: "Subject Alignment",
  curriculums: "Curriculum Alignment",
  grade_bands: "Grade Band Alignment",
  location: "Location Compatibility",
  employment_type: "Employment Type",
  work_arrangement: "Work Arrangement",
  languages: "Language Alignment",
  visa_status: "Visa Status",
  certifications: "Certification Alignment",
  experience: "Experience Alignment",
};

// ── Eligibility ────────────────────────────────────────────────

function computeEligibility(input: MatchEngineInput, componentRatios: Record<string, number>): MatchEligibilityFlags {
  const job = input.jobRequirements;

  const hasRequiredSubjectMatch = job.requiredSubjectIds.length === 0 || componentRatios.subjects > 0;
  const hasRequiredCurriculumMatch = job.requiredCurriculumIds.length === 0 || componentRatios.curriculums > 0;
  const hasRequiredCertificationMatch = job.requiredCertificationIds.length === 0 || componentRatios.certifications > 0;
  const meetsMinimumExperience = job.experienceMin == null || input.teacherProfile.yearsOfExperience >= job.experienceMin;
  const locationCompatible = componentRatios.location >= 0.5;
  const hasRequiredLanguageMatch = job.requiredLanguageIds.length === 0 || componentRatios.languages > 0;
  const hasVerifiedTrustSignals = input.teacherTrust.totalVerifiedCount > 0;

  // Count hard requirements
  const hardChecks: boolean[] = [];
  const hardComponents = HARD_REQUIREMENT_COMPONENTS as readonly string[];

  if (hardComponents.includes("subjects") && job.requiredSubjectIds.length > 0) hardChecks.push(hasRequiredSubjectMatch);
  if (hardComponents.includes("curriculums") && job.requiredCurriculumIds.length > 0) hardChecks.push(hasRequiredCurriculumMatch);
  if (hardComponents.includes("certifications") && job.requiredCertificationIds.length > 0) hardChecks.push(hasRequiredCertificationMatch);
  if (hardComponents.includes("languages") && job.requiredLanguageIds.length > 0) hardChecks.push(hasRequiredLanguageMatch);
  if (hardComponents.includes("experience") && job.experienceMin != null) hardChecks.push(meetsMinimumExperience);
  if (hardComponents.includes("location") && (job.countryTermId || job.regionTermId || job.cityTermId)) hardChecks.push(locationCompatible);

  return {
    hasRequiredSubjectMatch,
    hasRequiredCurriculumMatch,
    hasRequiredCertificationMatch,
    meetsMinimumExperience,
    locationCompatible,
    hasRequiredLanguageMatch,
    hasVerifiedTrustSignals,
    hardRequirementsMet: hardChecks.filter(Boolean).length,
    hardRequirementsTotal: hardChecks.length,
  };
}

// ── Strengths & Gaps ───────────────────────────────────────────

function buildStrengths(input: MatchEngineInput, ratios: Record<string, number>): MatchSignalEntry[] {
  const strengths: MatchSignalEntry[] = [];
  const teacher = input.teacherProfile;
  const quals = input.teacherQualifications;
  const job = input.jobRequirements;

  if (ratios.subjects >= 0.5 && job.requiredSubjectIds.length > 0) {
    const matched = teacher.subjectIds.filter(id => job.requiredSubjectIds.includes(id));
    for (const id of matched) strengths.push({ signal: id, label: "Matched Subject", category: "subjects" });
  }
  if (ratios.curriculums >= 0.5 && job.requiredCurriculumIds.length > 0) {
    const matched = teacher.curriculumIds.filter(id => job.requiredCurriculumIds.includes(id));
    for (const id of matched) strengths.push({ signal: id, label: "Matched Curriculum", category: "curriculums" });
  }
  if (ratios.certifications >= 0.5 && job.requiredCertificationIds.length > 0) {
    const matched = quals.certificationIds.filter(id => job.requiredCertificationIds.includes(id));
    for (const id of matched) strengths.push({ signal: id, label: "Matched Certification", category: "certifications" });
  }
  if (input.teacherTrust.totalVerifiedCount > 0) {
    strengths.push({ signal: "verified_profile", label: "Verified Profile", category: "trust" });
  }
  if (input.teacherTraining.completedCourseCount > 0) {
    strengths.push({ signal: "training_completed", label: "Training Completed", category: "training" });
  }

  return strengths;
}

function buildGaps(input: MatchEngineInput, ratios: Record<string, number>): MatchSignalEntry[] {
  const gaps: MatchSignalEntry[] = [];
  const teacher = input.teacherProfile;
  const quals = input.teacherQualifications;
  const job = input.jobRequirements;

  if (job.requiredCertificationIds.length > 0 && ratios.certifications < 1) {
    const missing = job.requiredCertificationIds.filter(id => !quals.certificationIds.includes(id));
    for (const id of missing) gaps.push({ signal: id, label: "Missing Certification", category: "certifications" });
  }
  if (job.requiredCurriculumIds.length > 0 && ratios.curriculums < 1) {
    const missing = job.requiredCurriculumIds.filter(id => !teacher.curriculumIds.includes(id));
    for (const id of missing) gaps.push({ signal: id, label: "Missing Curriculum", category: "curriculums" });
  }
  if (job.requiredGradeBandIds.length > 0 && ratios.grade_bands < 1) {
    const missing = job.requiredGradeBandIds.filter(id => !teacher.gradeBandIds.includes(id));
    for (const id of missing) gaps.push({ signal: id, label: "Missing Grade Band", category: "grade_bands" });
  }
  if (job.experienceMin != null && teacher.yearsOfExperience < job.experienceMin) {
    gaps.push({ signal: "insufficient_experience", label: "Insufficient Experience", category: "experience" });
  }
  if (ratios.location < 0.5 && (job.countryTermId || job.regionTermId || job.cityTermId)) {
    gaps.push({ signal: "location_mismatch", label: "Location Mismatch", category: "location" });
  }

  return gaps;
}

// ── Reason Codes ───────────────────────────────────────────────

function buildReasonCodes(ratios: Record<string, number>, eligibility: MatchEligibilityFlags, input: MatchEngineInput): MatchReasonCode[] {
  const codes: MatchReasonCode[] = [];
  const job = input.jobRequirements;

  // Positive signals
  if (ratios.subjects >= 0.7) codes.push({ code: "strong_subject_alignment", polarity: "positive", message: "Strong subject alignment with job requirements" });
  if (ratios.curriculums >= 0.7) codes.push({ code: "strong_curriculum_alignment", polarity: "positive", message: "Strong curriculum alignment with job requirements" });
  if (eligibility.hasVerifiedTrustSignals) codes.push({ code: "verified_profile_bonus", polarity: "positive", message: "Teacher has verified profile signals" });
  if (input.teacherTraining.completedCourseCount > 0) codes.push({ code: "relevant_training_present", polarity: "positive", message: "Teacher has completed relevant training" });
  if (ratios.experience >= 1) codes.push({ code: "meets_experience_requirement", polarity: "positive", message: "Meets minimum experience requirement" });

  // Negative signals
  if (job.requiredCurriculumIds.length > 0 && ratios.curriculums === 0) codes.push({ code: "missing_required_curriculum", polarity: "negative", message: "No overlap with required curriculums" });
  if (job.requiredCertificationIds.length > 0 && ratios.certifications === 0) codes.push({ code: "no_required_certification", polarity: "negative", message: "Missing required certification" });
  if (job.experienceMin != null && !eligibility.meetsMinimumExperience) codes.push({ code: "insufficient_experience", polarity: "negative", message: "Does not meet minimum experience requirement" });
  if (ratios.location < 0.5 && (job.countryTermId || job.regionTermId || job.cityTermId)) codes.push({ code: "location_not_compatible", polarity: "negative", message: "Location does not match job requirements" });
  if (job.requiredSubjectIds.length > 0 && ratios.subjects === 0) codes.push({ code: "no_subject_overlap", polarity: "negative", message: "No overlap with required subjects" });
  if (job.requiredLanguageIds.length > 0 && ratios.languages === 0) codes.push({ code: "missing_required_language", polarity: "negative", message: "Missing required language" });

  return codes;
}

// ── Main Engine ────────────────────────────────────────────────

/**
 * Run the match engine for one teacher–job pair.
 *
 * @param input - Normalized signals for teacher and job
 * @returns Full match result with score, band, eligibility, and reasons
 */
export function runMatchEngine(input: MatchEngineInput): MatchEngineResult {
  // 1. Score each component as a 0–1 ratio
  const ratios: Record<string, number> = {};
  for (const key of Object.keys(MATCH_COMPONENT_WEIGHTS) as ComponentKey[]) {
    ratios[key] = COMPONENT_SCORERS[key](input);
  }

  // 2. Build component score objects and accumulate weighted total
  let totalWeightedScore = 0;
  const componentScores: MatchComponentScore[] = [];

  for (const [key, weight] of Object.entries(MATCH_COMPONENT_WEIGHTS) as [ComponentKey, number][]) {
    const ratio = ratios[key];
    const score = Math.round(ratio * weight * 10) / 10; // one decimal
    totalWeightedScore += score;
    componentScores.push({
      component: key,
      label: COMPONENT_LABELS[key],
      score,
      maxScore: weight,
      matched: ratio >= 0.5,
    });
  }

  // 3. Clamp final score to 0–100
  const matchScore = clampMatchScore(Math.round(totalWeightedScore), 100);
  const matchBand = resolveMatchBand(matchScore);

  // 4. Eligibility
  const eligibility = computeEligibility(input, ratios);

  // 5. Strengths, gaps, reason codes
  const strengths = buildStrengths(input, ratios);
  const gaps = buildGaps(input, ratios);
  const reasonCodes = buildReasonCodes(ratios, eligibility, input);

  return {
    teacherId: input.teacherId,
    jobId: input.jobId,
    matchScore,
    matchBand,
    componentScores,
    eligibility,
    strengths,
    gaps,
    reasonCodes,
    computedAt: new Date().toISOString(),
    triggeredByEvent: input.metadata.triggeredByEvent,
    freshness: {
      isStale: false,
      freshnessStatus: "fresh",
    },
  };
}
