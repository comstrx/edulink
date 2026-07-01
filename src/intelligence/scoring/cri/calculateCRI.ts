/**
 * CRI Scoring Engine — Pure Deterministic Logic
 * Sprint 8H-A: Score & Logic Stabilization
 *
 * Max score: 100
 *   Education:      20
 *   Experience:     20
 *   Certifications: 20
 *   Training:       15
 *   Language:       10
 *   Verification:   15
 */

import type { CriInput, CriResult } from "./criTypes";

const MAX_EDUCATION = 20;
const MAX_EXPERIENCE = 20;
const MAX_CERTIFICATIONS = 20;
const MAX_TRAINING = 15;
const MAX_LANGUAGE = 10;
const MAX_VERIFICATION = 15;

function scoreEducation(termId: string | null): number {
  if (!termId) return 0;
  // Any education level present earns full points;
  // granular tiering can be added via a lookup map later.
  return MAX_EDUCATION;
}

function scoreExperience(years: number | null): number {
  if (years == null || years <= 0) return 0;
  if (years >= 10) return MAX_EXPERIENCE;
  if (years >= 5) return 15;
  if (years >= 3) return 10;
  if (years >= 1) return 5;
  return 2;
}

function scoreCertifications(ids: string[]): number {
  const count = ids.length;
  if (count === 0) return 0;
  if (count >= 4) return MAX_CERTIFICATIONS;
  if (count >= 3) return 15;
  if (count >= 2) return 10;
  return 5;
}

function scoreTraining(ids: string[]): number {
  const count = ids.length;
  if (count === 0) return 0;
  if (count >= 10) return MAX_TRAINING;
  if (count >= 7) return 12;
  if (count >= 5) return 10;
  if (count >= 3) return 7;
  if (count >= 1) return 4;
  return 0;
}

function scoreLanguage(termId: string | null): number {
  if (!termId) return 0;
  return MAX_LANGUAGE;
}

function scoreVerification(status: CriInput["verificationStatus"]): number {
  let score = 0;
  if (status.identityVerified) score += 5;
  if (status.educationVerified) score += 5;
  if (status.experienceVerified) score += 5;
  return Math.min(score, MAX_VERIFICATION);
}

export function calculateCRI(input: CriInput): CriResult {
  const breakdown = {
    education: scoreEducation(input.educationLevelTermId),
    experience: scoreExperience(input.yearsExperience),
    certifications: scoreCertifications(input.certificationIds),
    training: scoreTraining(input.completedTrainingIds),
    language: scoreLanguage(input.languageLevelTermId),
    verification: scoreVerification(input.verificationStatus),
  };

  const score = Math.min(
    100,
    breakdown.education +
      breakdown.experience +
      breakdown.certifications +
      breakdown.training +
      breakdown.language +
      breakdown.verification,
  );

  return { score, breakdown };
}
