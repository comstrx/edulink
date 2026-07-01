/**
 * Reputation Tier Engine — Sprint 8B
 *
 * Derives credibility tier from reputation score + dimension coverage.
 * Tiers are deterministic and explainable.
 */

import type { ReputationTier, ReputationDimension } from "../types/reputation.types";
import { ALL_DIMENSIONS } from "./reputation-weights";

export interface TierInput {
  reputationScore: number;
  dimensionScores: Record<string, number>;
  verifiedSignalCount: number;
}

interface TierThreshold {
  tier: ReputationTier;
  minScore: number;
  minDimensions: number;
  minVerifiedSignals: number;
}

const TIER_THRESHOLDS: TierThreshold[] = [
  { tier: "mentor_level", minScore: 300, minDimensions: 6, minVerifiedSignals: 20 },
  { tier: "expert", minScore: 200, minDimensions: 5, minVerifiedSignals: 15 },
  { tier: "advanced_practitioner", minScore: 120, minDimensions: 4, minVerifiedSignals: 8 },
  { tier: "verified_practitioner", minScore: 60, minDimensions: 3, minVerifiedSignals: 4 },
  { tier: "practitioner", minScore: 20, minDimensions: 2, minVerifiedSignals: 1 },
  { tier: "emerging", minScore: 0, minDimensions: 0, minVerifiedSignals: 0 },
];

export function computeReputationTier(input: TierInput): ReputationTier {
  const activeDimensions = ALL_DIMENSIONS.filter(
    (d) => (input.dimensionScores[d] ?? 0) > 0
  ).length;

  for (const threshold of TIER_THRESHOLDS) {
    if (
      input.reputationScore >= threshold.minScore &&
      activeDimensions >= threshold.minDimensions &&
      input.verifiedSignalCount >= threshold.minVerifiedSignals
    ) {
      return threshold.tier;
    }
  }

  return "emerging";
}

/** Explain why a teacher is at a given tier */
export function explainTier(input: TierInput): {
  currentTier: ReputationTier;
  nextTier: ReputationTier | null;
  blockers: string[];
} {
  const currentTier = computeReputationTier(input);
  const currentIdx = TIER_THRESHOLDS.findIndex((t) => t.tier === currentTier);
  const nextThreshold = currentIdx > 0 ? TIER_THRESHOLDS[currentIdx - 1] : null;

  const activeDimensions = ALL_DIMENSIONS.filter(
    (d) => (input.dimensionScores[d] ?? 0) > 0
  ).length;

  const blockers: string[] = [];
  if (nextThreshold) {
    if (input.reputationScore < nextThreshold.minScore)
      blockers.push(`Need ${nextThreshold.minScore - input.reputationScore} more reputation points`);
    if (activeDimensions < nextThreshold.minDimensions)
      blockers.push(`Need activity in ${nextThreshold.minDimensions - activeDimensions} more dimensions`);
    if (input.verifiedSignalCount < nextThreshold.minVerifiedSignals)
      blockers.push(`Need ${nextThreshold.minVerifiedSignals - input.verifiedSignalCount} more verified signals`);
  }

  return {
    currentTier,
    nextTier: nextThreshold?.tier ?? null,
    blockers,
  };
}
