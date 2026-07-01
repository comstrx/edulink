/**
 * Gap Engine v1 — Input Assembly
 *
 * Transforms raw domain data into a normalized GapEngineInput.
 * Keeps the engine free of data-fetching concerns.
 *
 * Phase 6B — Live implementation
 */

import type {
  GapEngineInput,
  GapProfileSignals,
  GapQualificationSignals,
  GapTrustSignals,
  GapTrainingSignals,
  GapHiringSignals,
  GapMatchSignals,
} from "./gap-engine.types";
import type {
  GapRawData,
  GapRawTeacherProfile,
  GapRawVerifiedState,
  GapRawApplicationHistory,
  GapRawMatchSnapshot,
} from "./gap-data-loader";
import { loadGapRawData } from "./gap-data-loader";

// ── Context ────────────────────────────────────────────────────

export interface GapInputContext {
  triggeredByEvent?: string;
  triggeredAt?: string;
}

// ── Profile signal derivation ──────────────────────────────────

const isEmpty = (v: unknown): boolean =>
  v == null ||
  (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0);

const hasJsonEntries = (v: unknown): boolean =>
  Array.isArray(v) && v.length > 0;

export function deriveProfileGapSignals(
  profile: GapRawTeacherProfile | null,
): GapProfileSignals {
  if (!profile) {
    return {
      missingHeadline: true,
      missingBio: true,
      missingAvatar: true,
      missingSubjectMappings: true,
      missingCurriculumMappings: true,
      missingGradeBandMappings: true,
      missingExperienceEntries: true,
      missingEducationEntries: true,
      missingLanguageEntries: true,
      missingContactEmail: true,
      missingCvUrl: true,
      missingLocation: true,
      profileCompletenessScore: 0,
    };
  }

  const missingHeadline = isEmpty(profile.full_name);
  const missingBio = isEmpty(profile.bio);
  const missingAvatar = isEmpty(profile.avatar_url);
  const missingSubjectMappings = isEmpty(profile.subject_ids);
  const missingCurriculumMappings = isEmpty(profile.curriculum_ids);
  const missingGradeBandMappings = isEmpty(profile.grade_band_ids);
  const missingExperienceEntries = !hasJsonEntries(profile.experience);
  const missingEducationEntries = !hasJsonEntries(profile.education);
  const missingLanguageEntries = isEmpty(profile.language_ids);
  const missingContactEmail = isEmpty(profile.contact_email);
  const missingCvUrl = isEmpty(profile.cv_url);
  const missingLocation = isEmpty(profile.country_id);

  // Compute completeness as percentage of filled fields
  const checks = [
    !missingHeadline,
    !missingBio,
    !missingAvatar,
    !missingSubjectMappings,
    !missingCurriculumMappings,
    !missingGradeBandMappings,
    !missingExperienceEntries,
    !missingEducationEntries,
    !missingLanguageEntries,
    !missingContactEmail,
    !missingCvUrl,
    !missingLocation,
  ];
  const filledCount = checks.filter(Boolean).length;
  const profileCompletenessScore = Math.round((filledCount / checks.length) * 100);

  return {
    missingHeadline,
    missingBio,
    missingAvatar,
    missingSubjectMappings,
    missingCurriculumMappings,
    missingGradeBandMappings,
    missingExperienceEntries,
    missingEducationEntries,
    missingLanguageEntries,
    missingContactEmail,
    missingCvUrl,
    missingLocation,
    profileCompletenessScore,
  };
}

// ── Qualification signal derivation ────────────────────────────

export function deriveQualificationGapSignals(
  rawData: GapRawData,
): GapQualificationSignals {
  const profile = rawData.teacherProfile;
  const legacyCertIds = profile?.certification_ids ?? [];
  const allCertIds = [...new Set([...rawData.certificationTermIds, ...legacyCertIds])];

  // Aggregate missing required certs/skills from recent match snapshots
  const missingCertIds = new Set<string>();
  const missingSkillIds = new Set<string>();
  for (const snap of rawData.recentMatchSnapshots) {
    for (const termId of snap.unmatched_term_ids) {
      // We don't know the type from the term ID alone, so add to both sets
      // The engine will cross-reference with actual gap categories
      missingCertIds.add(termId);
    }
  }

  return {
    certificationIds: allCertIds,
    licenseIds: rawData.licenseTermIds,
    degreeIds: rawData.degreeTermIds,
    skillIds: rawData.skillTermIds,
    missingRequiredCertificationIds: [...missingCertIds].filter(id => !allCertIds.includes(id)),
    missingRequiredSkillIds: [...missingSkillIds].filter(id => !rawData.skillTermIds.includes(id)),
  };
}

// ── Trust signal derivation ────────────────────────────────────

export function deriveTrustGapSignals(
  verifiedState: GapRawVerifiedState | null,
): GapTrustSignals {
  if (!verifiedState) {
    return {
      identityVerified: false,
      educationVerified: false,
      experienceVerified: false,
      credentialVerified: false,
      missingVerificationTypes: ["identity", "education", "experience", "credential"],
    };
  }

  const creds = Array.isArray(verifiedState.credentials)
    ? (verifiedState.credentials as Array<Record<string, unknown>>)
    : [];

  const verifiedTypes = new Set(
    creds
      .filter(c => c.status === "verified" || c.status === "approved")
      .map(c => String(c.type ?? c.verificationType ?? "")),
  );

  const identityVerified = verifiedTypes.has("identity");
  const educationVerified = verifiedTypes.has("education");
  const experienceVerified = verifiedTypes.has("employment") || verifiedTypes.has("experience");
  const credentialVerified = verifiedTypes.has("credential");

  const allTypes = ["identity", "education", "experience", "credential"];
  const verifiedFlags = [identityVerified, educationVerified, experienceVerified, credentialVerified];
  const missingVerificationTypes = allTypes.filter((_, i) => !verifiedFlags[i]);

  return {
    identityVerified,
    educationVerified,
    experienceVerified,
    credentialVerified,
    missingVerificationTypes,
  };
}

// ── Training signal derivation ─────────────────────────────────

export function deriveTrainingGapSignals(
  profile: GapRawTeacherProfile | null,
): GapTrainingSignals {
  const completedTraining = profile?.completed_training;
  const items = Array.isArray(completedTraining) ? completedTraining as Array<Record<string, unknown>> : [];

  const relevantTermIds: string[] = [];
  for (const item of items) {
    if (Array.isArray(item.skillIds)) {
      relevantTermIds.push(...(item.skillIds as string[]));
    }
  }

  return {
    completedCourseCount: items.length,
    completedPathwayCount: 0,
    relevantTrainingTermIds: [...new Set(relevantTermIds)],
    hasNoTraining: items.length === 0,
  };
}

// ── Hiring signal derivation ───────────────────────────────────

export function deriveHiringGapSignals(
  appHistory: GapRawApplicationHistory,
): GapHiringSignals {
  return {
    totalApplications: appHistory.totalApplications,
    totalRejections: appHistory.totalRejections,
    totalShortlists: appHistory.totalShortlists,
    totalInterviews: appHistory.totalInterviews,
    rejectionReasonIds: [], // rejection reasons not yet stored as term IDs
  };
}

// ── Match gap signal derivation ────────────────────────────────

export function deriveMatchGapSignals(
  matchSnapshots: GapRawMatchSnapshot[],
): GapMatchSignals {
  if (matchSnapshots.length === 0) {
    return {
      recentMatchGapTermIds: [],
      missingCurriculumIds: [],
      missingCertificationIds: [],
      missingLanguageIds: [],
      missingGradeBandIds: [],
      insufficientExperience: false,
      locationMismatchCount: 0,
    };
  }

  // Aggregate unmatched term IDs across recent matches
  const allUnmatched = new Set<string>();
  let locationMismatches = 0;
  let experienceGaps = false;

  for (const snap of matchSnapshots) {
    for (const termId of snap.unmatched_term_ids) {
      allUnmatched.add(termId);
    }

    // Parse dimensions to detect specific gap types
    const dims = Array.isArray(snap.dimensions)
      ? (snap.dimensions as Array<Record<string, unknown>>)
      : [];

    for (const dim of dims) {
      if (dim.dimension === "location" && dim.matched === false) {
        locationMismatches++;
      }
      if (dim.dimension === "experience" && dim.matched === false) {
        experienceGaps = true;
      }
    }
  }

  return {
    recentMatchGapTermIds: [...allUnmatched],
    missingCurriculumIds: [], // will be enriched in 6C when engine cross-references
    missingCertificationIds: [],
    missingLanguageIds: [],
    missingGradeBandIds: [],
    insufficientExperience: experienceGaps,
    locationMismatchCount: locationMismatches,
  };
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Assemble a GapEngineInput by loading and normalizing domain data.
 * Primary entry point for the service layer.
 */
export async function assembleGapInput(
  teacherId: string,
  context?: GapInputContext,
): Promise<GapEngineInput> {
  const rawData = await loadGapRawData(teacherId);
  return assembleGapInputFromRaw(teacherId, rawData, context);
}

/**
 * Assemble a GapEngineInput from pre-loaded raw data.
 * Pure function — no I/O. Useful for testing.
 */
export function assembleGapInputFromRaw(
  teacherId: string,
  rawData: GapRawData,
  context?: GapInputContext,
): GapEngineInput {
  return {
    teacherId,
    profileGapSignals: deriveProfileGapSignals(rawData.teacherProfile),
    qualificationGapSignals: deriveQualificationGapSignals(rawData),
    trustGapSignals: deriveTrustGapSignals(rawData.verifiedState),
    trainingGapSignals: deriveTrainingGapSignals(rawData.teacherProfile),
    hiringGapSignals: deriveHiringGapSignals(rawData.applicationHistory),
    matchGapSignals: deriveMatchGapSignals(rawData.recentMatchSnapshots),
    metadata: {
      triggeredByEvent: context?.triggeredByEvent,
      triggeredAt: context?.triggeredAt ?? new Date().toISOString(),
    },
  };
}
