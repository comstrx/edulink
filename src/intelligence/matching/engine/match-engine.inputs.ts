/**
 * Match Engine v1 — Input Assembly
 *
 * Transforms raw domain data into a normalized MatchEngineInput.
 * Keeps the engine free of data-fetching concerns.
 *
 * Phase 5B — Live implementation
 */

import type {
  MatchEngineInput,
  MatchTeacherProfileSignals,
  MatchTeacherQualificationSignals,
  MatchTeacherTrustSignals,
  MatchTeacherTrainingSignals,
  MatchJobRequirementSignals,
  MatchComputeMetadata,
} from "./match-engine.types";
import type {
  MatchRawData,
  MatchRawTeacherProfile,
  MatchRawTeacherQualifications,
  MatchRawVerifiedState,
  MatchRawJob,
  MatchRawJobSkillReq,
  MatchRawJobLangReq,
} from "./match-data-loader";
import { loadMatchRawData } from "./match-data-loader";

// ── Context ────────────────────────────────────────────────────

export interface MatchInputContext {
  triggeredByEvent?: string;
  triggeredAt?: string;
}

// ── Teacher profile signal derivation ──────────────────────────

export function deriveTeacherProfileSignals(
  profile: MatchRawTeacherProfile | null,
): MatchTeacherProfileSignals {
  if (!profile) {
    return {
      subjectIds: [],
      curriculumIds: [],
      gradeBandIds: [],
      languageIds: [],
      yearsOfExperience: 0,
      countryId: null,
      regionId: null,
      cityId: null,
      employmentTypeTermIds: [],
      workArrangementTermIds: [],
      visaStatusTermId: null,
    };
  }

  return {
    subjectIds: profile.subject_ids ?? [],
    curriculumIds: profile.curriculum_ids ?? [],
    gradeBandIds: profile.grade_band_ids ?? [],
    languageIds: profile.language_ids ?? [],
    yearsOfExperience: profile.years_of_experience ?? 0,
    countryId: profile.country_id,
    regionId: profile.region_id,
    cityId: profile.city_id,
    employmentTypeTermIds: profile.employment_type_term_ids ?? [],
    workArrangementTermIds: profile.work_arrangement_term_ids ?? [],
    visaStatusTermId: profile.visa_status_term_id,
  };
}

// ── Teacher qualification signal derivation ────────────────────

export function deriveTeacherQualificationSignals(
  quals: MatchRawTeacherQualifications,
  profile: MatchRawTeacherProfile | null,
): MatchTeacherQualificationSignals {
  // Merge relational cert IDs with legacy certification_ids from profile
  const legacyCertIds = profile?.certification_ids ?? [];
  const allCertIds = [...new Set([...quals.certificationTermIds, ...legacyCertIds])];

  return {
    certificationIds: allCertIds,
    licenseIds: quals.licenseTermIds,
    degreeIds: quals.degreeTermIds,
    skillIds: quals.skillTermIds,
  };
}

// ── Teacher trust signal derivation ────────────────────────────

export function deriveTeacherTrustSignals(
  verifiedState: MatchRawVerifiedState | null,
): MatchTeacherTrustSignals {
  if (!verifiedState) {
    return {
      identityVerified: false,
      educationVerified: false,
      experienceVerified: false,
      credentialVerified: false,
      totalVerifiedCount: 0,
    };
  }

  const creds = Array.isArray(verifiedState.credentials)
    ? (verifiedState.credentials as Array<Record<string, unknown>>)
    : [];

  const verifiedTypes = new Set(
    creds
      .filter((c) => c.status === "verified" || c.status === "approved")
      .map((c) => String(c.type ?? c.verificationType ?? "")),
  );

  return {
    identityVerified: verifiedTypes.has("identity"),
    educationVerified: verifiedTypes.has("education"),
    experienceVerified: verifiedTypes.has("employment") || verifiedTypes.has("experience"),
    credentialVerified: verifiedTypes.has("credential"),
    totalVerifiedCount: verifiedState.verified_count,
  };
}

// ── Teacher training signal derivation ─────────────────────────

export function deriveTeacherTrainingSignals(
  profile: MatchRawTeacherProfile | null,
): MatchTeacherTrainingSignals {
  const completedTraining = profile?.completed_training;

  if (!Array.isArray(completedTraining)) {
    return {
      completedCourseCount: 0,
      completedPathwayCount: 0,
      relevantTrainingTermIds: [],
    };
  }

  const items = completedTraining as Array<Record<string, unknown>>;

  // Extract any skill/subject term IDs from completed training for relevance matching
  const relevantTermIds: string[] = [];
  for (const item of items) {
    if (Array.isArray(item.skillIds)) {
      relevantTermIds.push(...(item.skillIds as string[]));
    }
    if (typeof item.courseId === "string") {
      // courseId itself isn't a taxonomy term, but we keep the array for future enrichment
    }
  }

  return {
    completedCourseCount: items.length,
    completedPathwayCount: 0, // pathway tracking not yet in completed_training JSON
    relevantTrainingTermIds: [...new Set(relevantTermIds)],
  };
}

// ── Job requirement signal derivation ──────────────────────────

export function deriveJobRequirementSignals(
  job: MatchRawJob | null,
  skillReqs: MatchRawJobSkillReq[],
  langReqs: MatchRawJobLangReq[],
): MatchJobRequirementSignals {
  if (!job) {
    return {
      requiredSubjectIds: [],
      requiredCurriculumIds: [],
      requiredGradeBandIds: [],
      requiredLanguageIds: [],
      requiredCertificationIds: [],
      requiredSkillIds: [],
      experienceMin: null,
      countryTermId: null,
      regionTermId: null,
      cityTermId: null,
      employmentTypeTermIds: [],
      workArrangementTermIds: [],
      visaStatusTermIds: [],
      preferredSubjectIds: [],
      preferredCurriculumIds: [],
      preferredSkillIds: [],
    };
  }

  // Separate required vs preferred skill requirements
  const requiredSkillIds = skillReqs
    .filter((r) => r.required_or_preferred === "required")
    .map((r) => r.skill_term_id);
  const preferredSkillIds = skillReqs
    .filter((r) => r.required_or_preferred === "preferred")
    .map((r) => r.skill_term_id);

  // Separate required vs preferred language requirements
  const requiredLangFromReqs = langReqs
    .filter((r) => r.required_or_preferred === "required")
    .map((r) => r.language_term_id);

  // Merge job-level language_term_ids with required language requirements
  const allRequiredLangs = [...new Set([
    ...(job.language_term_ids ?? []),
    ...requiredLangFromReqs,
  ])];

  return {
    requiredSubjectIds: job.subject_term_ids ?? [],
    requiredCurriculumIds: job.curriculum_term_ids ?? [],
    requiredGradeBandIds: job.grade_band_term_ids ?? [],
    requiredLanguageIds: allRequiredLangs,
    requiredCertificationIds: job.certification_term_ids ?? [],
    requiredSkillIds,
    experienceMin: job.experience_min,
    countryTermId: job.country_term_id,
    regionTermId: job.region_term_id,
    cityTermId: job.city_term_id,
    employmentTypeTermIds: job.employment_type_term_ids ?? [],
    workArrangementTermIds: job.work_arrangement_term_ids ?? [],
    visaStatusTermIds: job.visa_status_term_ids ?? [],
    preferredSubjectIds: [],
    preferredCurriculumIds: [],
    preferredSkillIds,
  };
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Assemble a MatchEngineInput by loading and normalizing domain data.
 * Primary entry point for the service layer.
 */
export async function assembleMatchInput(
  teacherId: string,
  jobId: string,
  context?: MatchInputContext,
): Promise<MatchEngineInput> {
  const rawData = await loadMatchRawData(teacherId, jobId);
  return assembleMatchInputFromRaw(teacherId, jobId, rawData, context);
}

/**
 * Assemble a MatchEngineInput from pre-loaded raw data.
 * Pure function — no I/O. Useful for testing.
 */
export function assembleMatchInputFromRaw(
  teacherId: string,
  jobId: string,
  rawData: MatchRawData,
  context?: MatchInputContext,
): MatchEngineInput {
  const teacherProfile = deriveTeacherProfileSignals(rawData.teacherProfile);
  const teacherQualifications = deriveTeacherQualificationSignals(
    rawData.teacherQualifications,
    rawData.teacherProfile,
  );
  const teacherTrust = deriveTeacherTrustSignals(rawData.verifiedState);
  const teacherTraining = deriveTeacherTrainingSignals(rawData.teacherProfile);
  const jobRequirements = deriveJobRequirementSignals(
    rawData.job,
    rawData.jobSkillReqs,
    rawData.jobLangReqs,
  );

  const metadata: MatchComputeMetadata = {
    triggeredByEvent: context?.triggeredByEvent,
    triggeredAt: context?.triggeredAt ?? new Date().toISOString(),
  };

  return {
    teacherId,
    jobId,
    teacherProfile,
    teacherQualifications,
    teacherTrust,
    teacherTraining,
    jobRequirements,
    metadata,
  };
}
