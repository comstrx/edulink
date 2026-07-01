/**
 * CRI Engine v1 — Input Assembly
 *
 * Transforms raw domain data into a normalized CriEngineInput.
 * Keeps the engine free of data-fetching concerns.
 *
 * Phase 4B — Live implementation
 */

import type {
  CriEngineInput,
  CriProfileSignals,
  CriTrainingSignals,
  CriTrustSignals,
  CriHiringSignals,
  CriComputeMetadata,
} from "./cri-engine.types";
import type { CriRawData, CriRawProfile, CriRawCounts, CriRawVerifiedState, CriRawHiringAggregates, CriRawTrainingGrowth } from "./cri-data-loader";
import { loadCriRawData } from "./cri-data-loader";

// ── Context for metadata propagation ───────────────────────────

export interface CriInputContext {
  triggeredByEvent?: string;
  triggeredAt?: string;
}

// ── Profile signal derivation ──────────────────────────────────

const PROFILE_FIELDS_CHECKED = 10; // total checkable boolean signals

export function deriveProfileSignals(
  profile: CriRawProfile | null,
  counts: CriRawCounts,
): CriProfileSignals {
  if (!profile) {
    return {
      hasHeadline: false,
      hasBio: false,
      hasSubjectMappings: false,
      hasCurriculumMappings: false,
      hasExperienceEntries: false,
      hasEducationEntries: false,
      hasLanguageEntries: false,
      profileCompletenessScore: 0,
    };
  }

  const hasHeadline = (profile.full_name ?? "").trim().length > 0;
  const hasBio = (profile.bio ?? "").trim().length > 0;
  const hasSubjectMappings = (profile.subject_ids ?? []).length > 0;
  const hasCurriculumMappings = (profile.curriculum_ids ?? []).length > 0;
  const hasExperienceEntries = Array.isArray(profile.experience) && (profile.experience as unknown[]).length > 0;
  const hasEducationEntries = counts.degreeCount > 0 || (Array.isArray(profile.education) && (profile.education as unknown[]).length > 0);
  const hasLanguageEntries = counts.languageCount > 0;

  // Additional fields for completeness score
  const hasAvatar = !!profile.avatar_url;
  const hasLocation = !!(profile.country_id || profile.region_id || profile.city_id);
  const hasSkills = counts.skillCount > 0;

  const filled = [
    hasHeadline,
    hasBio,
    hasSubjectMappings,
    hasCurriculumMappings,
    hasExperienceEntries,
    hasEducationEntries,
    hasLanguageEntries,
    hasAvatar,
    hasLocation,
    hasSkills,
  ].filter(Boolean).length;

  const profileCompletenessScore = Math.round((filled / PROFILE_FIELDS_CHECKED) * 100);

  return {
    hasHeadline,
    hasBio,
    hasSubjectMappings,
    hasCurriculumMappings,
    hasExperienceEntries,
    hasEducationEntries,
    hasLanguageEntries,
    profileCompletenessScore,
  };
}

// ── Training signal derivation (v2: uses runtime growth signals) ──

export function deriveTrainingSignals(
  profile: CriRawProfile | null,
  growth?: CriRawTrainingGrowth,
): CriTrainingSignals {
  // v2: Prefer runtime growth signals when available
  if (growth && growth.completedCourseCount > 0) {
    return {
      completedCourseCount: growth.completedCourseCount,
      completedPathwayCount: growth.completedPathwayCount,
      recentCompletionCount: growth.recentCompletionCount > 0 ? growth.recentCompletionCount : undefined,
      verifiedCompletionCount: growth.verifiedCompletionCount > 0 ? growth.verifiedCompletionCount : undefined,
      criBoostTotal: growth.criBoostTotal > 0 ? growth.criBoostTotal : undefined,
      approvedEvidenceCount: growth.approvedEvidenceCount > 0 ? growth.approvedEvidenceCount : undefined,
      mentorApprovedCount: growth.mentorApprovedCount > 0 ? growth.mentorApprovedCount : undefined,
      activePathwayProgressPercent: growth.activePathwayProgressPercent > 0 ? growth.activePathwayProgressPercent : undefined,
      earnedCredentialCount: growth.earnedCredentialCount > 0 ? growth.earnedCredentialCount : undefined,
    };
  }

  // Fallback: Legacy completed_training JSON field
  const completedTraining = profile?.completed_training;

  if (!Array.isArray(completedTraining)) {
    return {
      completedCourseCount: growth?.completedCourseCount ?? 0,
      verifiedCompletionCount: growth?.verifiedCompletionCount,
      approvedEvidenceCount: growth?.approvedEvidenceCount,
      mentorApprovedCount: growth?.mentorApprovedCount,
      activePathwayProgressPercent: growth?.activePathwayProgressPercent,
      earnedCredentialCount: growth?.earnedCredentialCount,
      criBoostTotal: growth?.criBoostTotal,
    };
  }

  const items = completedTraining as Array<Record<string, unknown>>;
  const completedCourseCount = items.length;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const recentCompletionCount = items.filter((item) => {
    const completedAt = item.completedAt ?? item.completed_at;
    if (typeof completedAt !== "string") return false;
    return new Date(completedAt) >= twelveMonthsAgo;
  }).length;

  return {
    completedCourseCount,
    recentCompletionCount: recentCompletionCount > 0 ? recentCompletionCount : undefined,
    verifiedCompletionCount: growth?.verifiedCompletionCount,
    criBoostTotal: growth?.criBoostTotal,
    approvedEvidenceCount: growth?.approvedEvidenceCount,
    mentorApprovedCount: growth?.mentorApprovedCount,
    activePathwayProgressPercent: growth?.activePathwayProgressPercent,
    earnedCredentialCount: growth?.earnedCredentialCount,
  };
}

// ── Trust signal derivation ────────────────────────────────────

export function deriveTrustSignals(
  verifiedState: CriRawVerifiedState | null,
): CriTrustSignals {
  if (!verifiedState) {
    return {
      identityVerified: false,
      educationVerified: false,
      experienceVerified: false,
      credentialVerified: false,
      totalVerifiedCount: 0,
    };
  }

  // Parse credentials array to determine specific verification types
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

// ── Hiring signal derivation ───────────────────────────────────

export function deriveHiringSignals(
  hiring: CriRawHiringAggregates,
): CriHiringSignals {
  return {
    applicationsCount: hiring.applicationsCount,
    shortlistedCount: hiring.shortlistedCount,
    rejectionsCount: hiring.rejectionsCount,
    interviewsCount: hiring.interviewsCount,
  };
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Assemble a CriEngineInput by loading and normalizing domain data.
 *
 * This is the primary entry point for the service layer.
 * Calls the data loader, then normalizes each signal group.
 */
export async function assembleCriInput(
  teacherId: string,
  context?: CriInputContext,
): Promise<CriEngineInput> {
  const rawData = await loadCriRawData(teacherId);
  return assembleCriInputFromRaw(teacherId, rawData, context);
}

/**
 * Assemble a CriEngineInput from pre-loaded raw data.
 *
 * Useful for testing and for callers that already have raw data.
 * Pure function — no I/O.
 */
export function assembleCriInputFromRaw(
  teacherId: string,
  rawData: CriRawData,
  context?: CriInputContext,
): CriEngineInput {
  const profileSignals = deriveProfileSignals(rawData.profile, rawData.counts);
  const trainingSignals = deriveTrainingSignals(rawData.profile, rawData.trainingGrowth);
  const trustSignals = deriveTrustSignals(rawData.verifiedState);
  const hiringSignals = deriveHiringSignals(rawData.hiring);

  const metadata: CriComputeMetadata = {
    computedForTeacherId: teacherId,
    triggeredByEvent: context?.triggeredByEvent,
    triggeredAt: context?.triggeredAt ?? new Date().toISOString(),
  };

  return {
    teacherId,
    profileSignals,
    trainingSignals,
    trustSignals,
    hiringSignals,
    metadata,
  };
}
