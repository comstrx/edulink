/**
 * Canonical Reputation Adapter
 *
 * Single source of truth for reputation scoring and level derivation.
 * Both useProfessionalReputation (single) and fetchBatchReputation (batch)
 * MUST use this adapter — no duplicated scoring logic anywhere.
 */

import type {
  ReputationGraphLevel,
  TrustSignals,
  TrainingEvidenceSignals,
  MentoringSignals,
  HiringOutcomeSignals,
} from "./types/reputation-graph.types";
import { deriveReputationGraphLevel } from "./utils/derive-reputation-level";

// ── Canonical Score Input ──

export interface CanonicalReputationScoreInput {
  yearsExp: number | null;
  credentialCount: number;
  trainingCount: number;
  verificationCount: number;
  reviewScore: number | null;
  reviewCount: number;
  mentoringValidations: number;
  completedSessions: number;
  hiredCount: number;
}

// ── Canonical Score Computation (single definition) ──

export function computeCanonicalReputationScore(input: CanonicalReputationScoreInput): number {
  // Experience (0–20)
  let exp = 0;
  if (input.yearsExp != null && input.yearsExp > 0) {
    if (input.yearsExp >= 15) exp = 20;
    else if (input.yearsExp >= 10) exp = 16;
    else if (input.yearsExp >= 5) exp = 12;
    else if (input.yearsExp >= 3) exp = 8;
    else if (input.yearsExp >= 1) exp = 4;
    else exp = 2;
  }

  // Credentials (0–20)
  let cred = 0;
  if (input.credentialCount >= 5) cred = 20;
  else if (input.credentialCount >= 4) cred = 16;
  else if (input.credentialCount >= 3) cred = 12;
  else if (input.credentialCount >= 2) cred = 8;
  else if (input.credentialCount >= 1) cred = 4;

  // Training (0–20)
  let train = 0;
  if (input.trainingCount >= 10) train = 20;
  else if (input.trainingCount >= 7) train = 15;
  else if (input.trainingCount >= 5) train = 12;
  else if (input.trainingCount >= 3) train = 8;
  else if (input.trainingCount >= 1) train = 4;

  // Verification (0–10)
  let verif = 0;
  if (input.verificationCount >= 5) verif = 10;
  else if (input.verificationCount >= 3) verif = 7;
  else if (input.verificationCount >= 1) verif = 4;

  // Reviews (0–10)
  let rev = 0;
  if (input.reviewCount > 0 && input.reviewScore != null) {
    if (input.reviewScore >= 4.5 && input.reviewCount >= 5) rev = 10;
    else if (input.reviewScore >= 4.0 && input.reviewCount >= 3) rev = 7;
    else if (input.reviewCount >= 1) rev = 4;
  }

  // Mentoring (0–10)
  let mentor = 0;
  if (input.mentoringValidations >= 5) mentor = 10;
  else if (input.mentoringValidations >= 3) mentor = 7;
  else if (input.mentoringValidations >= 1) mentor = 4;

  // Hiring outcomes (0–10)
  let hire = 0;
  if (input.hiredCount >= 2) hire = 10;
  else if (input.hiredCount >= 1) hire = 7;
  else if (input.completedSessions >= 3) hire = 3;

  return Math.min(100, exp + cred + train + verif + rev + mentor + hire);
}

// ── Canonical Level Derivation (re-export for convenience) ──

export { deriveReputationGraphLevel };

// ── Canonical Summary ──

export interface CanonicalReputationSummary {
  score: number;
  level: ReputationGraphLevel;
}

/**
 * Single-teacher canonical reputation: score + level from raw signal groups.
 */
export function getCanonicalReputation(signals: {
  trust: TrustSignals;
  training: TrainingEvidenceSignals;
  mentoring: MentoringSignals;
  hiring: HiringOutcomeSignals;
  experienceYears: number | null;
  reviewScore: number | null;
  reviewCount: number;
}): CanonicalReputationSummary {
  const credentialCount = signals.training.earnedBadges + signals.training.earnedCertificates;

  const score = computeCanonicalReputationScore({
    yearsExp: signals.experienceYears,
    credentialCount,
    trainingCount: signals.training.verifiedCompletions,
    verificationCount: signals.trust.verificationCount,
    reviewScore: signals.reviewScore,
    reviewCount: signals.reviewCount,
    mentoringValidations: signals.mentoring.mentorValidationCount,
    completedSessions: signals.mentoring.completedSessions,
    hiredCount: signals.hiring.hiredCount,
  });

  const level = deriveReputationGraphLevel({
    trust: signals.trust,
    training: signals.training,
    mentoring: signals.mentoring,
    hiring: signals.hiring,
    experienceYears: signals.experienceYears,
  });

  return { score, level };
}

/**
 * Batch canonical reputation: same logic as getCanonicalReputation
 * applied to a map of teacher signals.
 */
export function getCanonicalReputationBatch(
  teacherSignals: Record<string, {
    trust: TrustSignals;
    training: TrainingEvidenceSignals;
    mentoring: MentoringSignals;
    hiring: HiringOutcomeSignals;
    experienceYears: number | null;
    reviewScore: number | null;
    reviewCount: number;
  }>
): Record<string, CanonicalReputationSummary> {
  const result: Record<string, CanonicalReputationSummary> = {};
  for (const [teacherId, signals] of Object.entries(teacherSignals)) {
    result[teacherId] = getCanonicalReputation(signals);
  }
  return result;
}
