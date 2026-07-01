/**
 * Gap Engine v1 — Type Contracts
 *
 * Defines normalized input and output shapes for teacher gap analysis.
 * These contracts decouple the engine from data-loading and persistence.
 *
 * Phase 6A — Skeleton
 */

// ── Gap Categories ─────────────────────────────────────────────

export type GapCategory =
  | "profile_gap"
  | "certification_gap"
  | "curriculum_gap"
  | "grade_band_gap"
  | "language_gap"
  | "verification_gap"
  | "training_gap"
  | "experience_gap"
  | "trust_gap"
  | "employability_signal_gap";

export const GAP_CATEGORY_LABELS: Record<GapCategory, string> = {
  profile_gap: "Profile Gap",
  certification_gap: "Certification Gap",
  curriculum_gap: "Curriculum Gap",
  grade_band_gap: "Grade Band Gap",
  language_gap: "Language Gap",
  verification_gap: "Verification Gap",
  training_gap: "Training Gap",
  experience_gap: "Experience Gap",
  trust_gap: "Trust Gap",
  employability_signal_gap: "Employability Signal Gap",
};

// ── Severity & Confidence ──────────────────────────────────────

export type GapSeverity = "critical" | "high" | "medium" | "low";
export type GapConfidence = "high" | "medium" | "low";

// ── Input Signals ──────────────────────────────────────────────

export interface GapProfileSignals {
  missingHeadline: boolean;
  missingBio: boolean;
  missingAvatar: boolean;
  missingSubjectMappings: boolean;
  missingCurriculumMappings: boolean;
  missingGradeBandMappings: boolean;
  missingExperienceEntries: boolean;
  missingEducationEntries: boolean;
  missingLanguageEntries: boolean;
  missingContactEmail: boolean;
  missingCvUrl: boolean;
  missingLocation: boolean;
  profileCompletenessScore: number; // 0–100
}

export interface GapQualificationSignals {
  certificationIds: string[];
  licenseIds: string[];
  degreeIds: string[];
  skillIds: string[];
  missingRequiredCertificationIds: string[];
  missingRequiredSkillIds: string[];
}

export interface GapTrustSignals {
  identityVerified: boolean;
  educationVerified: boolean;
  experienceVerified: boolean;
  credentialVerified: boolean;
  missingVerificationTypes: string[];
}

export interface GapTrainingSignals {
  completedCourseCount: number;
  completedPathwayCount: number;
  relevantTrainingTermIds: string[];
  hasNoTraining: boolean;
}

export interface GapHiringSignals {
  totalApplications: number;
  totalRejections: number;
  totalShortlists: number;
  totalInterviews: number;
  rejectionReasonIds: string[];
}

export interface GapMatchSignals {
  recentMatchGapTermIds: string[];
  missingCurriculumIds: string[];
  missingCertificationIds: string[];
  missingLanguageIds: string[];
  missingGradeBandIds: string[];
  insufficientExperience: boolean;
  locationMismatchCount: number;
}

export interface GapComputeMetadata {
  triggeredByEvent?: string;
  triggeredAt?: string;
  sourceUpdatedAtHints?: Record<string, string>;
}

// ── Engine Input ───────────────────────────────────────────────

export interface GapEngineInput {
  teacherId: string;
  profileGapSignals: GapProfileSignals;
  qualificationGapSignals: GapQualificationSignals;
  trustGapSignals: GapTrustSignals;
  trainingGapSignals: GapTrainingSignals;
  hiringGapSignals: GapHiringSignals;
  matchGapSignals: GapMatchSignals;
  metadata: GapComputeMetadata;
}

// ── Engine Output ──────────────────────────────────────────────

export interface GapItem {
  gapId: string;
  gapType: GapCategory;
  taxonomyTermId?: string;
  label: string;
  severity: GapSeverity;
  confidence: GapConfidence;
  evidenceSources: GapEvidenceSource[];
  relatedJobId?: string;
  relatedSignals: string[];
}

export type GapEvidenceSource =
  | "profile_analysis"
  | "job_requirement"
  | "match_result"
  | "hiring_history"
  | "trust_analysis"
  | "training_analysis";

export interface GapGroupSummary {
  category: GapCategory;
  label: string;
  count: number;
  highestSeverity: GapSeverity;
}

export interface GapReasonCode {
  code: string;
  polarity: "gap" | "addressed";
  message: string;
}

export interface GapFreshness {
  isStale: boolean;
  freshnessStatus: "fresh" | "stale" | "expired";
}

export interface GapEngineResult {
  teacherId: string;
  gapItems: GapItem[];
  totalGaps: number;
  priorityGapIds: string[];
  groupedGapSummary: GapGroupSummary[];
  reasonCodes: GapReasonCode[];
  computedAt: string;
  triggeredByEvent?: string;
  freshness: GapFreshness;
}
