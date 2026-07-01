/**
 * Reputation Score Engine — Types
 * Sprint 8H-A: Score & Logic Stabilization
 */

export interface ReputationInput {
  yearsExperience: number | null;
  certificationIds: string[];
  completedTrainingIds: string[];
  verifiedDocumentsCount: number;
  schoolEndorsements: number;
}

export interface ReputationBreakdown {
  experience: number;
  certifications: number;
  training: number;
  verification: number;
  endorsements: number;
}

export interface ReputationResult {
  score: number;
  breakdown: ReputationBreakdown;
}
