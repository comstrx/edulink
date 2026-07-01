/**
 * Reputation Score Engine — Pure Deterministic Logic
 * Sprint 8H-A: Score & Logic Stabilization
 *
 * Max score: 100
 *   Experience:     25
 *   Certifications: 25
 *   Training:       20
 *   Verification:   15
 *   Endorsements:   15
 */

import type { ReputationInput, ReputationResult } from "./reputationTypes";

const MAX_EXPERIENCE = 25;
const MAX_CERTIFICATIONS = 25;
const MAX_TRAINING = 20;
const MAX_VERIFICATION = 15;
const MAX_ENDORSEMENTS = 15;

function scoreExperience(years: number | null): number {
  if (years == null || years <= 0) return 0;
  if (years >= 15) return MAX_EXPERIENCE;
  if (years >= 10) return 20;
  if (years >= 5) return 15;
  if (years >= 3) return 10;
  if (years >= 1) return 5;
  return 2;
}

function scoreCertifications(ids: string[]): number {
  const count = ids.length;
  if (count === 0) return 0;
  if (count >= 5) return MAX_CERTIFICATIONS;
  if (count >= 4) return 20;
  if (count >= 3) return 15;
  if (count >= 2) return 10;
  return 5;
}

function scoreTraining(ids: string[]): number {
  const count = ids.length;
  if (count === 0) return 0;
  if (count >= 10) return MAX_TRAINING;
  if (count >= 7) return 15;
  if (count >= 5) return 12;
  if (count >= 3) return 8;
  if (count >= 1) return 4;
  return 0;
}

function scoreVerification(docCount: number): number {
  if (docCount <= 0) return 0;
  if (docCount >= 5) return MAX_VERIFICATION;
  if (docCount >= 3) return 10;
  if (docCount >= 1) return 5;
  return 0;
}

function scoreEndorsements(count: number): number {
  if (count <= 0) return 0;
  if (count >= 5) return MAX_ENDORSEMENTS;
  if (count >= 3) return 10;
  if (count >= 1) return 5;
  return 0;
}

export function calculateReputationScore(input: ReputationInput): ReputationResult {
  const breakdown = {
    experience: scoreExperience(input.yearsExperience),
    certifications: scoreCertifications(input.certificationIds),
    training: scoreTraining(input.completedTrainingIds),
    verification: scoreVerification(input.verifiedDocumentsCount),
    endorsements: scoreEndorsements(input.schoolEndorsements),
  };

  const score = Math.min(
    100,
    breakdown.experience +
      breakdown.certifications +
      breakdown.training +
      breakdown.verification +
      breakdown.endorsements,
  );

  return { score, breakdown };
}
