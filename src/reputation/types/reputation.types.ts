/**
 * Professional Reputation System — Core Types
 * Sprint 8B
 */

export type ReputationDimension =
  | "teaching_practice"
  | "instructional_leadership"
  | "subject_expertise"
  | "professional_development"
  | "mentor_recognition"
  | "credential_authority"
  | "professional_consistency"
  | "hiring_success";

export type ReputationTier =
  | "emerging"
  | "practitioner"
  | "verified_practitioner"
  | "advanced_practitioner"
  | "expert"
  | "mentor_level";

export interface ReputationEvent {
  id: string;
  teacherId: string;
  eventType: string;
  sourceDomain: string;
  sourceReferenceId?: string;
  reputationDelta: number;
  dimension: ReputationDimension;
  description: string;
  createdAt: string;
}

export interface ReputationProfile {
  teacherId: string;
  reputationScore: number;
  credibilityTier: ReputationTier;
  dimensionScores: Record<ReputationDimension, number>;
  totalReputationEvents: number;
  verifiedSignalCount: number;
  updatedAt: string;
}

export interface ReputationEventInput {
  teacherId: string;
  eventType: string;
  sourceDomain: string;
  sourceReferenceId?: string;
  dimension: ReputationDimension;
  description: string;
}

/** Dimension score summary for UI */
export interface DimensionSummary {
  dimension: ReputationDimension;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

/** Reputation signals exposed to hiring/discovery */
export interface ReputationSignal {
  key: string;
  label: string;
  active: boolean;
  tier: ReputationTier;
}
