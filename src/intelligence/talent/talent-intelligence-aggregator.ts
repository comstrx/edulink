/**
 * Talent Intelligence Aggregator
 *
 * Pure function that converts raw signals into a TalentIntelligenceProfile.
 * No database calls. Deterministic. Explainable.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

import type {
  TalentAggregatorRawData,
  TalentIntelligenceProfile,
  HiringAdvantageSignal,
  GrowthMomentum,
  ReadinessLevel,
  CredentialStrength,
} from "./types/talent-intelligence.types";

const ENGINE_VERSION = "7a.1";

// ── Readiness Level ────────────────────────────────────────────

function computeReadinessLevel(criScore: number): ReadinessLevel {
  if (criScore >= 86) return "highly_ready";
  if (criScore >= 71) return "ready";
  if (criScore >= 41) return "developing";
  return "early";
}

// ── Credential Strength ────────────────────────────────────────

function computeCredentialStrength(
  totalCredentials: number,
  verifiedCredentials: number,
): CredentialStrength {
  if (totalCredentials === 0) return "none";
  if (verifiedCredentials >= 5) return "exceptional";
  if (verifiedCredentials >= 3) return "strong";
  if (totalCredentials >= 3) return "moderate";
  return "basic";
}

// ── Growth Momentum ────────────────────────────────────────────

function computeGrowthMomentum(raw: TalentAggregatorRawData): GrowthMomentum {
  const hasActivePathways = raw.activePathways.length > 0;
  const recentCompletions = raw.trainingCompletions.filter((c) => {
    if (!c.completedAt) return false;
    const daysSince =
      (Date.now() - new Date(c.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 90;
  });

  const recentVerified = recentCompletions.filter((c) => c.isVerified);

  if (recentVerified.length >= 3 || (recentCompletions.length >= 5 && hasActivePathways))
    return "accelerating";
  if (recentCompletions.length >= 2 || hasActivePathways) return "active";
  if (recentCompletions.length >= 1) return "emerging";
  return "inactive";
}

// ── Hiring Advantage Signals ───────────────────────────────────

function computeHiringAdvantageSignals(
  raw: TalentAggregatorRawData,
): HiringAdvantageSignal[] {
  const signals: HiringAdvantageSignal[] = [];
  const now = new Date().toISOString();

  // Verified teaching practice
  if (raw.trainingCompletions.some((c) => c.isVerified)) {
    const latest = raw.trainingCompletions
      .filter((c) => c.isVerified)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
    signals.push({
      type: "verified_teaching_practice",
      label: "Verified Teaching Practice",
      sourceId: latest?.id,
      earnedAt: latest?.completedAt ?? now,
    });
  }

  // Credential strength
  if (raw.earnedCredentials.length >= 3) {
    signals.push({
      type: "credential_strength",
      label: "Strong Credential Portfolio",
      earnedAt: raw.earnedCredentials[0]?.issuedAt ?? now,
    });
  }

  // Pathway achieved
  if (raw.completedPathways.length > 0) {
    signals.push({
      type: "pathway_achieved",
      label: "Professional Pathway Completed",
      sourceId: raw.completedPathways[0]?.id,
      earnedAt: raw.completedPathways[0]?.completedAt ?? now,
    });
  }

  // Verified classroom artifact
  if (raw.approvedEvidence.length > 0) {
    signals.push({
      type: "verified_classroom_artifact",
      label: "Verified Classroom Artifact",
      sourceId: raw.approvedEvidence[0]?.id,
      earnedAt: now,
    });
  }

  // Mentor validated
  if (raw.mentorApprovals.length > 0) {
    signals.push({
      type: "mentor_validated",
      label: "Mentor Validated Practice",
      sourceId: raw.mentorApprovals[0]?.id,
      earnedAt: raw.mentorApprovals[0]?.reviewedAt ?? now,
    });
  }

  // Growth momentum signal
  const momentum = computeGrowthMomentum(raw);
  if (momentum === "accelerating" || momentum === "active") {
    signals.push({
      type: "growth_momentum",
      label: momentum === "accelerating" ? "Accelerating Growth" : "Active Learner",
      earnedAt: now,
    });
  }

  // Gap closure
  if (
    raw.gapSnapshot &&
    raw.gapSnapshot.totalGaps === 0 &&
    raw.trainingCompletions.length > 0
  ) {
    signals.push({
      type: "gap_closure",
      label: "All Gaps Resolved",
      earnedAt: now,
    });
  }

  return signals;
}

// ── Main Aggregator ────────────────────────────────────────────

export function aggregateTalentIntelligence(
  teacherId: string,
  raw: TalentAggregatorRawData,
): TalentIntelligenceProfile {
  const criScore = raw.criSnapshot?.score ?? 0;
  const verifiedCompletionCount = raw.trainingCompletions.filter(
    (c) => c.isVerified,
  ).length;

  // Unique gap categories
  const gapCategories = raw.gapSnapshot
    ? [...new Set(raw.gapSnapshot.gaps.map((g) => g.category))]
    : [];

  // Best match
  const bestMatch =
    raw.matchSnapshots.length > 0 ? raw.matchSnapshots[0] : null;

  return {
    teacherId,
    criScore,
    criDimensions: raw.criSnapshot?.dimensions ?? [],
    criJobId: raw.criSnapshot?.jobId ?? null,
    verifiedSignalCount:
      verifiedCompletionCount +
      raw.approvedEvidence.length +
      raw.mentorApprovals.length,
    verifiedCompletionCount,
    credentialCount: raw.earnedCredentials.length,
    credentialVerifiedCount: raw.verifiedState?.verifiedCount ?? 0,
    credentialStrength: computeCredentialStrength(
      raw.earnedCredentials.length,
      raw.verifiedState?.verifiedCount ?? 0,
    ),
    pathwayCompletionCount: raw.completedPathways.length,
    activePathwayCount: raw.activePathways.length,
    trainingCompletionCount: raw.trainingCompletions.length,
    unresolvedGapCount: raw.gapSnapshot?.totalGaps ?? 0,
    gapCategories,
    bestMatchScore: bestMatch?.score ?? null,
    bestMatchJobId: bestMatch?.jobId ?? null,
    hiringAdvantageSignals: computeHiringAdvantageSignals(raw),
    growthMomentum: computeGrowthMomentum(raw),
    readinessLevel: computeReadinessLevel(criScore),
    intelligenceUpdatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}
