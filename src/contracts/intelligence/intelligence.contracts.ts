import type { DomainEvent } from "../core/domain-event";

/**
 * Intelligence Domain Contracts
 *
 * Covers skill gap detection and match scoring.
 *
 * Phase 1 — Smart Domain Contracts Foundation
 */

/** Skill gap identified. Producer: Intelligence → Consumers: Training (recommendations) */
export interface SkillGapDetectedPayload {
  teacherId: string;
  skillId: string;
  source: "job_rejection" | "job_requirement" | "assessment";
  relatedJobId?: string | null;
  detectedAt: string;
}

export type SkillGapDetectedEvent = DomainEvent<SkillGapDetectedPayload>;

/** Match score recalculated. Producer: Intelligence → Consumers: Hiring (ranking) */
export interface MatchScoreUpdatedPayload {
  teacherId: string;
  jobId: string;
  previousScore?: number | null;
  newScore: number;
  updatedAt: string;
}

export type MatchScoreUpdatedEvent = DomainEvent<MatchScoreUpdatedPayload>;

/* ── Aliases for event-map compatibility ────── */

export interface MatchScoreComputedPayload extends MatchScoreUpdatedPayload {}

export interface RecommendationGeneratedPayload {
  userId: string;
  recommendationType: "job" | "training" | "pathway" | "mentor";
  recommendedItemIds: string[];
  reason?: string;
}

export interface InsightPublishedPayload {
  insightType: string;
  targetDomain: string;
  data: Record<string, unknown>;
}

export interface TalentProfileUpdatedPayload {
  teacherId: string;
  criScore: number;
  readinessLevel: string;
  growthMomentum: string;
  hiringAdvantageCount: number;
  updatedAt: string;
}

/** Growth recommendation lifecycle event payload — Sprint 7C */
export interface GrowthRecommendationEventPayload {
  teacherId: string;
  recommendationCount: number;
  triggeredBy?: string;
  updatedAt: string;
}
