/**
 * Growth Recommendation Types — Sprint 7C (Updated Sprint 3)
 *
 * Defines the structured models for hiring→growth feedback loop.
 * These types bridge hiring outcomes to actionable training recommendations.
 *
 * Canonical vocabulary is defined in src/lib/growth/growth-contract.ts
 */

import type { CanonicalSourceType, CanonicalActionType } from "@/lib/growth/growth-contract";

// ── Growth Intervention Target ─────────────────────────────────

export type GrowthSourceType = CanonicalSourceType;

export type GrowthGapType =
  | "curriculum_competency"
  | "classroom_practice"
  | "language_proficiency"
  | "certification"
  | "evidence_verification"
  | "pathway_completion"
  | "subject_expertise"
  | "experience";

export type GrowthActionType = CanonicalActionType;

export type GrowthUrgency = "critical" | "high" | "medium" | "low";

export type GrowthRecommendationStatus =
  | "active"
  | "completed"
  | "dismissed"
  | "stale";

export interface GrowthInterventionTarget {
  teacherId: string;
  sourceType: GrowthSourceType;
  sourceTermIds: string[];
  sourceReferenceId?: string;
  targetGapType: GrowthGapType;
  targetCompetencyTermIds: string[];
  targetCredentialTermIds: string[];
  targetCurriculumTermIds: string[];
  targetActionType: GrowthActionType;
  urgencyLevel: GrowthUrgency;
  recommendationContext: string;
}

// ── Growth Recommendation ──────────────────────────────────────

export interface GrowthRecommendation {
  id?: string;
  teacherId: string;
  sourceType: GrowthSourceType;
  sourceReferenceId?: string;
  sourceTermIds: string[];
  recommendedItemId?: string;
  recommendedItemType?: string;
  recommendedActionType: GrowthActionType;
  recommendationReason: string;
  recommendationTrace: GrowthRecommendationTrace;
  priorityScore: number;
  status: GrowthRecommendationStatus;
}

export interface GrowthRecommendationTrace {
  sourceRejectionReason?: string;
  sourceGapTerms?: string[];
  blockingCondition?: string;
  suggestedOutcome?: string;
  currentRuntimeState?: string;
  mappedFrom?: string;
}

// ── Mapper Output ──────────────────────────────────────────────

export interface HiringGrowthMappingResult {
  teacherId: string;
  interventionTargets: GrowthInterventionTarget[];
  mappedAt: string;
  sourceEvent?: string;
}

// ── Engine Input ───────────────────────────────────────────────

export interface GrowthEngineTeacherState {
  activeEnrollmentItemIds: string[];
  activePathwayIds: string[];
  completedItemIds: string[];
  verifiedCompletionItemIds: string[];
  pendingEvidenceExecutionIds: string[];
  rejectedEvidenceIds: string[];
  pendingMentorReviewIds: string[];
  earnedCredentialSourceIds: string[];
  activePathwayProgress: { pathwayId: string; progressPercent: number }[];
}

// ── Refresh Result ─────────────────────────────────────────────

export interface GrowthRecommendationRefreshResult {
  teacherId: string;
  recommendationsCreated: number;
  recommendationsStaled: number;
  success: boolean;
  error?: string;
  completedAt: string;
  /** Additive — Sprint 2 Step 4: explainability metadata */
  explainability?: import("@/intelligence/observability/explainability.types").ExplainabilityMeta;
  explainabilityView?: import("@/intelligence/explainability/explainability.presentation").ExplainabilityView;
}
