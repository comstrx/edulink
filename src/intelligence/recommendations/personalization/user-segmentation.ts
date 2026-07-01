/**
 * User Segmentation Engine — Sprint 9: Personalization Layer
 *
 * Classifies teachers into behavioral segments based on existing
 * intelligence signals (talent profile). No new data sources.
 *
 * Segments:
 *   - beginner: Early-stage, low activity, few credentials
 *   - active: Engaged, developing, making progress
 *   - high_performer: Ready/highly ready, strong credentials, high CRI
 *   - struggling: Active but not progressing, many unresolved gaps
 *
 * Pure function — no side effects, no hooks, no DB calls.
 */

import type { TalentIntelligenceProfile } from "@/intelligence/talent/types/talent-intelligence.types";

// ── Segment Types ─────────────────────────────────────────────

export type UserSegment = "beginner" | "active" | "high_performer" | "struggling";

export interface SegmentClassification {
  segment: UserSegment;
  confidence: "high" | "medium" | "low";
  signals: string[];
}

// ── Classification Logic ──────────────────────────────────────

/**
 * Classifies a teacher into a behavioral segment using deterministic rules.
 * All thresholds are explicit and auditable.
 *
 * When no talent profile exists, defaults to "beginner".
 */
export function classifyUserSegment(
  profile: TalentIntelligenceProfile | null,
): SegmentClassification {
  if (!profile) {
    return {
      segment: "beginner",
      confidence: "low",
      signals: ["no_talent_profile"],
    };
  }

  const signals: string[] = [];

  // ── Collect signals ──
  const hasHighCri = profile.criScore >= 75;
  const hasModCri = profile.criScore >= 40;
  const isReady = profile.readinessLevel === "ready" || profile.readinessLevel === "highly_ready";
  const isDeveloping = profile.readinessLevel === "developing";
  const isEarly = profile.readinessLevel === "early";
  const hasCredentials = profile.credentialCount >= 2;
  const hasTrainingCompletions = profile.trainingCompletionCount >= 3;
  const hasActivePathways = profile.activePathwayCount > 0;
  const manyGaps = profile.unresolvedGapCount >= 4;
  const fewGaps = profile.unresolvedGapCount <= 1;
  const isGrowing = profile.growthMomentum === "active" || profile.growthMomentum === "accelerating";
  const isInactive = profile.growthMomentum === "inactive";
  const hasVerifiedSignals = profile.verifiedSignalCount >= 2;

  // ── High Performer ──
  if (isReady && hasHighCri && hasCredentials) {
    signals.push("readiness_ready_or_higher", "cri_75+", "credentials_2+");
    if (fewGaps) signals.push("few_gaps");
    if (hasVerifiedSignals) signals.push("verified_signals");
    return { segment: "high_performer", confidence: "high", signals };
  }

  if (isReady && hasTrainingCompletions && hasVerifiedSignals) {
    signals.push("readiness_ready", "training_3+", "verified_signals");
    return { segment: "high_performer", confidence: "medium", signals };
  }

  // ── Struggling ──
  if (manyGaps && hasModCri && !isGrowing) {
    signals.push("gaps_4+", "cri_40+_but_stalled", "not_growing");
    return { segment: "struggling", confidence: "high", signals };
  }

  if (isDeveloping && manyGaps && isInactive) {
    signals.push("developing_but_inactive", "gaps_4+");
    return { segment: "struggling", confidence: "medium", signals };
  }

  // ── Active ──
  if ((isDeveloping || isReady) && isGrowing) {
    signals.push("developing_or_ready", "growth_momentum_active");
    if (hasActivePathways) signals.push("active_pathways");
    if (hasTrainingCompletions) signals.push("training_completions");
    return { segment: "active", confidence: "high", signals };
  }

  if (hasActivePathways && hasModCri) {
    signals.push("active_pathways", "cri_40+");
    return { segment: "active", confidence: "medium", signals };
  }

  if (hasTrainingCompletions && !isEarly) {
    signals.push("training_completions", "past_early_stage");
    return { segment: "active", confidence: "medium", signals };
  }

  // ── Beginner (default) ──
  signals.push("early_or_low_activity");
  if (isEarly) signals.push("readiness_early");
  if (profile.credentialCount === 0) signals.push("no_credentials");
  if (profile.trainingCompletionCount === 0) signals.push("no_training");

  return {
    segment: "beginner",
    confidence: isEarly ? "high" : "medium",
    signals,
  };
}
