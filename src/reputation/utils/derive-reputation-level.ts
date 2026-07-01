/**
 * Reputation Level Derivation — Reputation Graph Layer
 *
 * Transparent, rule-based level assignment from signal counts.
 * No weighted scoring — just signal presence checks.
 *
 * Rules:
 * - Trusted:      trust verified + credentials + training + mentoring + hiring evidence
 * - Strong:       credentials + training + mentoring validation
 * - Established:  credentials + training completed
 * - Developing:   some training or credentials
 * - Emerging:     minimal signals
 */

import type {
  ReputationGraphLevel,
  TrustSignals,
  TrainingEvidenceSignals,
  MentoringSignals,
  HiringOutcomeSignals,
} from "../types/reputation-graph.types";

export function deriveReputationGraphLevel(input: {
  trust: TrustSignals;
  training: TrainingEvidenceSignals;
  mentoring: MentoringSignals;
  hiring: HiringOutcomeSignals;
  experienceYears: number | null;
}): ReputationGraphLevel {
  const hasCredentials = (input.training.earnedBadges + input.training.earnedCertificates) >= 1;
  const hasTraining = input.training.completedCourses >= 1;
  const hasVerifiedTraining = input.training.verifiedCompletions >= 1;
  const hasMentorValidation = input.mentoring.mentorValidationCount >= 1;
  const hasTrust = input.trust.trustLevel !== "none";
  const hasHiringEvidence = input.hiring.hiredCount >= 1;
  const hasPathways = input.training.completedPathways >= 1;
  const hasExperience = (input.experienceYears ?? 0) >= 3;

  // Count active signal categories
  const signalCount = [
    hasTrust,
    hasCredentials,
    hasVerifiedTraining || hasTraining,
    hasMentorValidation,
    hasHiringEvidence || hasPathways,
    hasExperience,
  ].filter(Boolean).length;

  if (signalCount >= 5) return "trusted";
  if (signalCount >= 4) return "strong";
  if (signalCount >= 3) return "established";
  if (signalCount >= 1) return "developing";
  return "emerging";
}

/**
 * Lightweight level derivation from a numeric score (for batch/search contexts
 * where full signal graph is not available).
 */
export function deriveLightweightReputationLevel(score: number): ReputationGraphLevel {
  if (score >= 80) return "trusted";
  if (score >= 60) return "strong";
  if (score >= 40) return "established";
  if (score >= 15) return "developing";
  return "emerging";
}
