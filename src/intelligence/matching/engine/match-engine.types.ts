/**
 * Match Engine v1 — Type Contracts
 *
 * Defines normalized input and output shapes for teacher–job matching.
 * These contracts decouple the engine from data-loading and persistence.
 *
 * Phase 5A — Skeleton
 */

// ── Match Band ─────────────────────────────────────────────────

/** Stable band classification for match scores */
export type MatchBand = "weak" | "partial" | "strong" | "high";

/** Human-readable labels keyed by band */
export const MATCH_BAND_LABELS: Record<MatchBand, string> = {
  weak: "Weak Match",
  partial: "Partial Match",
  strong: "Strong Match",
  high: "High Match",
};

// ── Input Signals ──────────────────────────────────────────────

/** Teacher profile-level signals (taxonomy IDs + numeric fields) */
export interface MatchTeacherProfileSignals {
  subjectIds: string[];
  curriculumIds: string[];
  gradeBandIds: string[];
  languageIds: string[];
  yearsOfExperience: number;
  countryId: string | null;
  regionId: string | null;
  cityId: string | null;
  employmentTypeTermIds: string[];
  workArrangementTermIds: string[];
  visaStatusTermId: string | null;
}

/** Teacher qualification signals */
export interface MatchTeacherQualificationSignals {
  certificationIds: string[];
  licenseIds: string[];
  degreeIds: string[];
  skillIds: string[];
}

/** Teacher trust/verification signals */
export interface MatchTeacherTrustSignals {
  identityVerified: boolean;
  educationVerified: boolean;
  experienceVerified: boolean;
  credentialVerified: boolean;
  totalVerifiedCount: number;
}

/** Teacher training signals */
export interface MatchTeacherTrainingSignals {
  completedCourseCount: number;
  completedPathwayCount: number;
  relevantTrainingTermIds: string[];
}

/** Job requirement signals (taxonomy IDs + constraints) */
export interface MatchJobRequirementSignals {
  requiredSubjectIds: string[];
  requiredCurriculumIds: string[];
  requiredGradeBandIds: string[];
  requiredLanguageIds: string[];
  requiredCertificationIds: string[];
  requiredSkillIds: string[];
  experienceMin: number | null;
  countryTermId: string | null;
  regionTermId: string | null;
  cityTermId: string | null;
  employmentTypeTermIds: string[];
  workArrangementTermIds: string[];
  visaStatusTermIds: string[];
  /** Preferred (soft) signals that boost but don't gate */
  preferredSubjectIds: string[];
  preferredCurriculumIds: string[];
  preferredSkillIds: string[];
}

/** Metadata about the computation trigger */
export interface MatchComputeMetadata {
  triggeredByEvent?: string;
  triggeredAt?: string;
  sourceUpdatedAtHints?: Record<string, string>;
}

// ── Engine Input ───────────────────────────────────────────────

/** Fully-normalized input contract for one match computation run */
export interface MatchEngineInput {
  teacherId: string;
  jobId: string;
  teacherProfile: MatchTeacherProfileSignals;
  teacherQualifications: MatchTeacherQualificationSignals;
  teacherTrust: MatchTeacherTrustSignals;
  teacherTraining: MatchTeacherTrainingSignals;
  jobRequirements: MatchJobRequirementSignals;
  metadata: MatchComputeMetadata;
}

// ── Eligibility Flags ──────────────────────────────────────────

/** Hard/soft requirement satisfaction flags — separate from score */
export interface MatchEligibilityFlags {
  hasRequiredSubjectMatch: boolean;
  hasRequiredCurriculumMatch: boolean;
  hasRequiredCertificationMatch: boolean;
  meetsMinimumExperience: boolean;
  locationCompatible: boolean;
  hasRequiredLanguageMatch: boolean;
  hasVerifiedTrustSignals: boolean;
  /** Count of hard requirements met vs total */
  hardRequirementsMet: number;
  hardRequirementsTotal: number;
}

// ── Engine Output ──────────────────────────────────────────────

/** Score for a single match component */
export interface MatchComponentScore {
  component: string;
  label: string;
  score: number;
  maxScore: number;
  matched: boolean;
}

/** Machine-readable reason code */
export interface MatchReasonCode {
  code: string;
  polarity: "positive" | "negative";
  message: string;
}

/** Structured strength/gap entry */
export interface MatchSignalEntry {
  signal: string;
  label: string;
  category: string;
}

/** Freshness metadata */
export interface MatchFreshness {
  isStale: boolean;
  freshnessStatus: "fresh" | "stale" | "expired";
}

/** Complete match engine output */
export interface MatchEngineResult {
  teacherId: string;
  jobId: string;
  matchScore: number;
  matchBand: MatchBand;
  componentScores: MatchComponentScore[];
  eligibility: MatchEligibilityFlags;
  strengths: MatchSignalEntry[];
  gaps: MatchSignalEntry[];
  reasonCodes: MatchReasonCode[];
  computedAt: string;
  triggeredByEvent?: string;
  freshness: MatchFreshness;
}
