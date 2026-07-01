/**
 * Candidate Intelligence Ranking Engine
 *
 * Pure, deterministic scoring function that converts a TalentIntelligenceProfile
 * into a numeric ranking score with full explanation metadata.
 *
 * Sprint 7B — Talent Search Intelligence Ranking
 */

import type { TalentIntelligenceProfile, CredentialStrength, GrowthMomentum } from "../types/talent-intelligence.types";

// ── Configurable Weights ───────────────────────────────────────

export interface RankingWeights {
  cri: number;
  match: number;
  verifiedSignals: number;
  credentialStrength: number;
  pathwayCompletion: number;
  gapPenaltyPerGap: number;
  growthMomentumBonus: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  cri: 0.35,
  match: 0.30,
  verifiedSignals: 0.15,
  credentialStrength: 0.10,
  pathwayCompletion: 0.10,
  gapPenaltyPerGap: 2,
  growthMomentumBonus: 5,
};

// ── Ranking Explanation ────────────────────────────────────────

export interface RankingExplanation {
  totalScore: number;
  criContribution: number;
  matchContribution: number;
  verifiedSignalsContribution: number;
  credentialContribution: number;
  pathwayContribution: number;
  gapPenalty: number;
  growthBonus: number;
}

// ── Mapping helpers ────────────────────────────────────────────

const CREDENTIAL_STRENGTH_SCORE: Record<CredentialStrength, number> = {
  none: 0,
  basic: 25,
  moderate: 50,
  strong: 75,
  exceptional: 100,
};

const GROWTH_MOMENTUM_BONUS: Record<GrowthMomentum, number> = {
  inactive: 0,
  emerging: 0.25,
  active: 0.6,
  accelerating: 1.0,
};

// ── Core Ranking Function ──────────────────────────────────────

/**
 * Compute a deterministic ranking score (0–100+) from a talent intelligence profile.
 *
 * All inputs come from the persisted intelligence profile — no raw table reads.
 */
export function computeCandidateRankingScore(
  profile: TalentIntelligenceProfile,
  weights: RankingWeights = DEFAULT_WEIGHTS,
): RankingExplanation {
  // Normalize CRI to 0–100 (already on that scale)
  const criNorm = Math.min(profile.criScore, 100);

  // Match score: 0–100 (null → 0)
  const matchNorm = Math.min(profile.bestMatchScore ?? 0, 100);

  // Verified signals: cap at 10 for normalization → 0–100
  const verifiedNorm = Math.min(profile.verifiedSignalCount, 10) * 10;

  // Credential strength: mapped to 0–100
  const credNorm = CREDENTIAL_STRENGTH_SCORE[profile.credentialStrength] ?? 0;

  // Pathway completion: cap at 5 for normalization → 0–100
  const pathwayNorm = Math.min(profile.pathwayCompletionCount, 5) * 20;

  // Weighted contributions
  const criContribution = weights.cri * criNorm;
  const matchContribution = weights.match * matchNorm;
  const verifiedSignalsContribution = weights.verifiedSignals * verifiedNorm;
  const credentialContribution = weights.credentialStrength * credNorm;
  const pathwayContribution = weights.pathwayCompletion * pathwayNorm;

  // Gap penalty: each unresolved gap deducts points
  const gapPenalty = Math.min(profile.unresolvedGapCount * weights.gapPenaltyPerGap, 15);

  // Growth momentum bonus
  const growthBonus =
    GROWTH_MOMENTUM_BONUS[profile.growthMomentum] * weights.growthMomentumBonus;

  const totalScore = Math.max(
    0,
    criContribution +
      matchContribution +
      verifiedSignalsContribution +
      credentialContribution +
      pathwayContribution -
      gapPenalty +
      growthBonus,
  );

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    criContribution: Math.round(criContribution * 100) / 100,
    matchContribution: Math.round(matchContribution * 100) / 100,
    verifiedSignalsContribution: Math.round(verifiedSignalsContribution * 100) / 100,
    credentialContribution: Math.round(credentialContribution * 100) / 100,
    pathwayContribution: Math.round(pathwayContribution * 100) / 100,
    gapPenalty: Math.round(gapPenalty * 100) / 100,
    growthBonus: Math.round(growthBonus * 100) / 100,
  };
}
