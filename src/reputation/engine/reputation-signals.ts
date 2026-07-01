/**
 * Reputation Signals — Sprint 8B
 *
 * Derives hiring-visible reputation signals from a reputation profile.
 * These signals are consumed by talent discovery and applicant intelligence.
 */

import type { ReputationProfile, ReputationSignal, ReputationTier } from "../types/reputation.types";

const TIER_ORDER: ReputationTier[] = [
  "emerging",
  "practitioner",
  "verified_practitioner",
  "advanced_practitioner",
  "expert",
  "mentor_level",
];

function tierAtLeast(current: ReputationTier, minimum: ReputationTier): boolean {
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(minimum);
}

export function buildReputationSignals(profile: ReputationProfile): ReputationSignal[] {
  const signals: ReputationSignal[] = [];
  const ds = profile.dimensionScores;

  signals.push({
    key: "verified_practitioner",
    label: "Verified Practitioner",
    active: tierAtLeast(profile.credibilityTier, "verified_practitioner"),
    tier: profile.credibilityTier,
  });

  signals.push({
    key: "mentor_recognized",
    label: "Mentor-Recognized Educator",
    active: (ds.mentor_recognition ?? 0) >= 20,
    tier: profile.credibilityTier,
  });

  signals.push({
    key: "credential_authority",
    label: "Strong Credential Authority",
    active: (ds.credential_authority ?? 0) >= 30,
    tier: profile.credibilityTier,
  });

  signals.push({
    key: "consistent_growth",
    label: "Consistent Professional Growth",
    active: (ds.professional_development ?? 0) >= 20 && (ds.professional_consistency ?? 0) >= 10,
    tier: profile.credibilityTier,
  });

  signals.push({
    key: "hiring_proven",
    label: "Hiring-Proven Educator",
    active: (ds.hiring_success ?? 0) >= 25,
    tier: profile.credibilityTier,
  });

  return signals;
}
