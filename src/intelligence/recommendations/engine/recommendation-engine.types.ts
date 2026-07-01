/**
 * Recommendation Engine v1 — Type Contracts
 *
 * Defines normalized input and output shapes for teacher recommendations.
 * These contracts decouple the engine from data-loading and persistence.
 *
 * Phase 7A — Skeleton
 */

// ── Recommendation Types ───────────────────────────────────────

export type RecommendationType =
  | "course_recommendation"
  | "pathway_recommendation"
  | "certification_recommendation"
  | "job_recommendation"
  | "profile_completion_action"
  | "verification_action"
  | "curriculum_alignment_action"
  | "language_improvement_action"
  | "experience_building_action"
  | "continue_pathway_action"
  | "submit_evidence_action"
  | "revise_submission_action"
  | "request_mentor_validation_action"
  | "pursue_credential_action";

export const RECOMMENDATION_TYPE_LABELS: Record<RecommendationType, string> = {
  course_recommendation: "Course Recommendation",
  pathway_recommendation: "Pathway Recommendation",
  certification_recommendation: "Certification Recommendation",
  job_recommendation: "Job Recommendation",
  profile_completion_action: "Profile Completion",
  verification_action: "Verification Action",
  curriculum_alignment_action: "Curriculum Alignment",
  language_improvement_action: "Language Improvement",
  experience_building_action: "Experience Building",
  continue_pathway_action: "Continue Pathway",
  submit_evidence_action: "Submit Evidence",
  revise_submission_action: "Revise Submission",
  request_mentor_validation_action: "Request Mentor Review",
  pursue_credential_action: "Pursue Credential",
};

// ── Grouping Keys ──────────────────────────────────────────────

export type RecommendationGroupKey =
  | "immediate_actions"
  | "profile_actions"
  | "trust_actions"
  | "training_actions"
  | "certification_actions"
  | "curriculum_alignment_actions"
  | "career_readiness_actions"
  | "evidence_actions"
  | "pathway_progress_actions"
  | "job_actions";

export const GROUP_KEY_LABELS: Record<RecommendationGroupKey, string> = {
  immediate_actions: "Immediate Actions",
  profile_actions: "Profile Actions",
  trust_actions: "Trust & Verification",
  training_actions: "Training & Development",
  certification_actions: "Certifications",
  curriculum_alignment_actions: "Curriculum Alignment",
  career_readiness_actions: "Career Readiness",
  evidence_actions: "Evidence & Practice",
  pathway_progress_actions: "Pathway Progress",
  job_actions: "Job Opportunities",
};

// ── Priority & Confidence ──────────────────────────────────────

export type RecommendationPriority = "critical" | "high" | "medium" | "low";
export type RecommendationConfidence = "high" | "medium" | "low";

// ── Input Signals ──────────────────────────────────────────────

export interface RecCriSignals {
  criScore: number;
  criBand: string;
  componentScores: { component: string; score: number; maxScore: number; met: boolean }[];
  reasonCodes: { code: string; polarity: string; message: string }[];
}

export interface RecGapSignals {
  gapItems: {
    gapId: string;
    gapType: string;
    taxonomyTermId?: string;
    label: string;
    severity: string;
    confidence: string;
    evidenceSources: string[];
  }[];
  priorityGapIds: string[];
  groupedGapSummary: { category: string; count: number; highestSeverity: string }[];
}

export interface RecMatchSignals {
  recentMatchScores: { jobId: string; score: number }[];
  recentMatchBands: string[];
  repeatedMatchGapPatterns: string[];
  recentEligibilityFlags: { jobId: string; eligible: boolean }[];
}

export interface RecTrustSignals {
  identityVerified: boolean;
  educationVerified: boolean;
  experienceVerified: boolean;
  credentialVerified: boolean;
}

export interface RecProfileSignals {
  profileCompletenessScore: number;
  missingCoreProfileFields: string[];
  subjectMappings: string[];
  curriculumMappings: string[];
  gradeBandMappings: string[];
}

export interface RecTrainingCatalogSignals {
  availableCourseIds: string[];
  availablePathwayIds: string[];
  mappedTrainingByTaxonomyTerm: Record<string, string[]>;
  certificationPreparationOffers: string[];
}

/** v2: Runtime execution state signals for context-aware recommendations */
export interface RecRuntimeSignals {
  /** Active pathways with progress info */
  activePathways: { pathwayId: string; progressPercent: number; title: string }[];
  /** Executions missing evidence submission */
  executionsMissingEvidence: { executionId: string; itemTitle: string }[];
  /** Evidence needing revision (rejected/needs_revision) */
  evidenceNeedingRevision: { evidenceId: string; executionId: string; title: string }[];
  /** Evidence submitted but not yet mentor-reviewed */
  evidencePendingReview: { evidenceId: string; executionId: string; title: string }[];
  /** Completions that could be upgraded to verified */
  completionsWithoutVerification: { executionId: string; itemTitle: string }[];
  /** Rejection reasons from hiring (taxonomy term IDs) */
  rejectionReasonTermIds: string[];
  /** Completed training item IDs (to avoid re-recommending) */
  completedItemIds: string[];
  /** cri_target values from active pathways */
  pathwayCriTargets: { pathwayId: string; criTarget: number }[];
}

export interface RecComputeMetadata {
  triggeredByEvent?: string;
  triggeredAt?: string;
  sourceUpdatedAtHints?: Record<string, string>;
}

// ── Engine Input ───────────────────────────────────────────────

export interface RecommendationEngineInput {
  teacherId: string;
  criSignals: RecCriSignals;
  gapSignals: RecGapSignals;
  matchSignals: RecMatchSignals;
  trustSignals: RecTrustSignals;
  profileSignals: RecProfileSignals;
  trainingCatalogSignals: RecTrainingCatalogSignals;
  runtimeSignals: RecRuntimeSignals;
  metadata: RecComputeMetadata;
}

// ── Engine Output ──────────────────────────────────────────────

export interface RecommendationItem {
  recommendationId: string;
  recommendationType: RecommendationType;
  targetId?: string;
  priority: RecommendationPriority;
  confidence: RecommendationConfidence;
  reasonCodes: string[];
  relatedGapIds: string[];
  relatedTaxonomyTermIds: string[];
  actionLabelKey: string;
  groupKey: RecommendationGroupKey;
}

export interface RecommendationGroupSummary {
  groupKey: RecommendationGroupKey;
  label: string;
  count: number;
  highestPriority: RecommendationPriority;
}

export interface RecommendationReasonCode {
  code: string;
  polarity: "recommendation" | "addressed";
  message: string;
}

export interface RecommendationFreshness {
  isStale: boolean;
  freshnessStatus: "fresh" | "stale" | "expired";
}

export interface RecommendationEngineResult {
  teacherId: string;
  recommendations: RecommendationItem[];
  topRecommendationIds: string[];
  groupedRecommendationSummary: RecommendationGroupSummary[];
  recommendationReasonSummary: RecommendationReasonCode[];
  reasonCodes: RecommendationReasonCode[];
  generatedAt: string;
  triggeredByEvent?: string;
  freshness: RecommendationFreshness;
}
