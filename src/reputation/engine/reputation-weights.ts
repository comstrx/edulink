/**
 * Reputation Scoring Weights — Sprint 8B
 *
 * Configurable weights for each reputation event type.
 * Reputation accumulates over time — these are additive deltas.
 */

import type { ReputationDimension } from "../types/reputation.types";

export interface ReputationWeightEntry {
  eventType: string;
  delta: number;
  dimension: ReputationDimension;
  description: string;
}

export const REPUTATION_WEIGHTS: Record<string, ReputationWeightEntry> = {
  verified_completion: {
    eventType: "verified_completion",
    delta: 5,
    dimension: "teaching_practice",
    description: "Completed verified training",
  },
  evidence_approved: {
    eventType: "evidence_approved",
    delta: 5,
    dimension: "teaching_practice",
    description: "Evidence approved by mentor",
  },
  mentor_review_approved: {
    eventType: "mentor_review_approved",
    delta: 10,
    dimension: "mentor_recognition",
    description: "Mentor-validated professional evidence",
  },
  credential_issued: {
    eventType: "credential_issued",
    delta: 15,
    dimension: "credential_authority",
    description: "Professional credential earned",
  },
  pathway_completed: {
    eventType: "pathway_completed",
    delta: 20,
    dimension: "professional_development",
    description: "Professional pathway completed",
  },
  career_stage_advanced: {
    eventType: "career_stage_advanced",
    delta: 25,
    dimension: "professional_consistency",
    description: "Advanced to next career stage",
  },
  training_completed: {
    eventType: "training_completed",
    delta: 3,
    dimension: "professional_development",
    description: "Training course completed",
  },
  hiring_success: {
    eventType: "hiring_success",
    delta: 25,
    dimension: "hiring_success",
    description: "Successfully hired for a position",
  },
};

/** Dimension labels for UI */
export const DIMENSION_LABELS: Record<ReputationDimension, string> = {
  teaching_practice: "Teaching Practice",
  instructional_leadership: "Instructional Leadership",
  subject_expertise: "Subject Expertise",
  professional_development: "Professional Development",
  mentor_recognition: "Mentor Recognition",
  credential_authority: "Credential Authority",
  professional_consistency: "Professional Consistency",
  hiring_success: "Hiring Success",
};

/** All dimensions */
export const ALL_DIMENSIONS: ReputationDimension[] = [
  "teaching_practice",
  "instructional_leadership",
  "subject_expertise",
  "professional_development",
  "mentor_recognition",
  "credential_authority",
  "professional_consistency",
  "hiring_success",
];
