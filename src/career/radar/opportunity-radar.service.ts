/**
 * Opportunity Radar Service
 *
 * Builds an opportunity radar signal from intelligence snapshots.
 * Pure function — reads adapter outputs, never recomputes.
 *
 * Step 10D — Career Operating System Layer
 */

import type {
  CareerReadinessSignal,
  JobCompatibilitySignal,
  VerificationSignal,
} from "@/intelligence/adapters/types/adapter-signals.types";

// ── Types ──────────────────────────────────────────────────────

export interface OpportunityRadarSignal {
  eligibleJobCount: number;
  eligibleSchoolTypes: string[];
  readinessDelta: number;
  newUnlockedOpportunities: string[];
  confidence: "low" | "medium" | "high";
  /** Whether enough data exists to generate meaningful radar */
  isAvailable: boolean;
}

export interface OpportunityRadarInputs {
  readiness: CareerReadinessSignal | null;
  matchSignals: JobCompatibilitySignal[];
  verification: VerificationSignal | null;
}

// ── Empty result ───────────────────────────────────────────────

function emptyRadar(): OpportunityRadarSignal {
  return {
    eligibleJobCount: 0,
    eligibleSchoolTypes: [],
    readinessDelta: 0,
    newUnlockedOpportunities: [],
    confidence: "low",
    isAvailable: false,
  };
}

// ── Main function ──────────────────────────────────────────────

/**
 * Builds opportunity radar from intelligence signals.
 * Degrades safely when signals are missing.
 */
export function buildOpportunityRadar(inputs: OpportunityRadarInputs): OpportunityRadarSignal {
  if (!inputs.readiness && inputs.matchSignals.length === 0) {
    return emptyRadar();
  }

  // Count eligible jobs (compatibility score >= 60)
  const eligibleMatches = inputs.matchSignals.filter((m) => m.compatibilityScore >= 60);
  const eligibleJobCount = eligibleMatches.length;

  // Determine school type eligibility from match strength areas
  const schoolTypeSet = new Set<string>();
  eligibleMatches.forEach((m) => {
    m.strengthAreas.forEach((s) => {
      if (s.dimension === "school_type" || s.dimension === "curriculum") {
        schoolTypeSet.add(s.label);
      }
    });
  });

  // Readiness delta: how far from next readiness tier
  let readinessDelta = 0;
  if (inputs.readiness) {
    const score = inputs.readiness.score;
    if (score < 41) readinessDelta = 41 - score;
    else if (score < 71) readinessDelta = 71 - score;
    else if (score < 86) readinessDelta = 86 - score;
    else readinessDelta = 0;
  }

  // New unlocked opportunities based on readiness + verification
  const unlocked: string[] = [];
  if (inputs.readiness) {
    if (inputs.readiness.readinessLevel === "ready" || inputs.readiness.readinessLevel === "highly_ready") {
      unlocked.push("premium_job_visibility");
    }
    if (inputs.readiness.score >= 70) {
      unlocked.push("featured_candidate_eligibility");
    }
  }
  if (inputs.verification) {
    if (inputs.verification.verificationLevel === "verified") {
      unlocked.push("verified_badge");
      unlocked.push("priority_in_search");
    } else if (inputs.verification.verificationLevel === "partial") {
      unlocked.push("partial_verification_badge");
    }
  }

  // Confidence based on data completeness
  const dataPoints = [
    inputs.readiness !== null,
    inputs.matchSignals.length > 0,
    inputs.verification !== null,
  ].filter(Boolean).length;
  const confidence: "low" | "medium" | "high" = dataPoints >= 3 ? "high" : dataPoints >= 2 ? "medium" : "low";

  return {
    eligibleJobCount,
    eligibleSchoolTypes: Array.from(schoolTypeSet),
    readinessDelta,
    newUnlockedOpportunities: unlocked,
    confidence,
    isAvailable: true,
  };
}
