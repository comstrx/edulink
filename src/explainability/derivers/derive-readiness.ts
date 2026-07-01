/**
 * Career Readiness Explanation Deriver
 *
 * Explains why a teacher has the current readiness level.
 * Sprint 2.2: Uses GrowthSummary (intelligence-only) for evidence.
 *
 * ⚠️ Readiness level comes from canonical source
 * (intelligence_talent_profiles.readiness_level), NOT computed here.
 */

import type { GrowthSummary } from "@/growth/types/growth-summary.types";
import type { ReputationGraphSummary } from "@/reputation/types/reputation-graph.types";
import type {
  ExplanationContract,
  ExplanationReason,
  MissingSignal,
  ExplanationAudience,
} from "../types/explanation-contract.types";
import { deriveConfidence } from "../utils/derive-confidence";
import { applyAudienceFilter } from "../utils/filter-by-audience";
import type { CanonicalReadinessLevel } from "@/intelligence/readiness/canonical-readiness.types";
import { CANONICAL_READINESS_LABELS } from "@/intelligence/readiness/canonical-readiness.types";

export function deriveReadinessExplanation(
  growth: GrowthSummary,
  reputation: ReputationGraphSummary,
  audience: ExplanationAudience,
  canonicalReadinessLevel: CanonicalReadinessLevel | null,
): ExplanationContract {
  if (growth.resolvedState !== "resolved") {
    return {
      status: growth.resolvedState === "loading" ? "loading" : "unavailable",
      context: "career_readiness",
      confidenceLevel: "low",
      summary: "Loading readiness data…",
      reasons: [],
      missingSignals: [],
      audience,
    };
  }

  const reasons: ExplanationReason[] = [];
  const missing: MissingSignal[] = [];

  // Credentials signal (primary) — from intelligence counts
  if (growth.growthSignals.credentialsReady) {
    reasons.push({
      label: `${growth.credentials.totalActive} active credential(s)`,
      sourceDomain: "training",
      signalType: "credential",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      signalCount: growth.credentials.totalActive,
      verificationBasis: "earned_credentials",
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Earned credentials (minimum 1)",
      sourceDomain: "training",
      signalType: "credential",
      hint: "Complete training courses to earn credentials.",
      visibility: ["public", "school", "internal"],
    });
  }

  // Training activity signal (primary)
  if (growth.growthSignals.trainingActive) {
    reasons.push({
      label: `${growth.trainingProgress.completedCount} training(s) completed, ${growth.trainingProgress.activePathways} active pathway(s)`,
      sourceDomain: "training",
      signalType: "training_enrollment",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      signalCount: growth.trainingProgress.completedCount + growth.trainingProgress.activePathways,
      verificationBasis: "training_completions",
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Active training enrollment",
      sourceDomain: "training",
      signalType: "training_enrollment",
      hint: "Enroll in a course or pathway to activate this signal.",
      visibility: ["public", "school", "internal"],
    });
  }

  // Verified completions (supplementary)
  if (growth.trainingProgress.verifiedCount > 0) {
    reasons.push({
      label: `${growth.trainingProgress.verifiedCount} verified completion(s)`,
      sourceDomain: "training",
      signalType: "training_completion",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      signalCount: growth.trainingProgress.verifiedCount,
      verificationBasis: "training_completions",
    });
  }

  // Growth momentum (from intelligence)
  if (growth.growthSignals.growthMomentumActive) {
    reasons.push({
      label: "Active growth momentum",
      sourceDomain: "training",
      signalType: "training_completion",
      evidenceStatus: "derived",
      visibility: ["public", "school", "internal"],
    });
  }

  // Reputation (independent signal)
  if (reputation.resolvedState === "resolved" && reputation.reputationLevel !== "emerging") {
    reasons.push({
      label: `Professional reputation: ${reputation.reputationLevel}`,
      sourceDomain: "reputation",
      signalType: "reputation_level",
      evidenceStatus: "derived",
      visibility: ["public", "school", "internal"],
    });
  }

  // Verification (supplementary, school-visible)
  if (reputation.trust.verifiedIdentity) {
    reasons.push({
      label: "Identity verified",
      sourceDomain: "trust",
      signalType: "verification",
      evidenceStatus: "verified",
      visibility: ["school", "internal"],
      verificationBasis: "account_verifications",
    });
  }

  const confidence = deriveConfidence(reasons, missing);
  const levelLabel = canonicalReadinessLevel
    ? CANONICAL_READINESS_LABELS[canonicalReadinessLevel]
    : "Unknown";

  const summary = !canonicalReadinessLevel
    ? "Career readiness data is not yet available."
    : canonicalReadinessLevel === "highly_ready"
      ? `Career readiness: ${levelLabel}. Strong professional profile with verified evidence.`
      : canonicalReadinessLevel === "early"
        ? `Career readiness: ${levelLabel}. Build your professional signals to improve readiness.`
        : `Career readiness: ${levelLabel}. ${missing.length} signal(s) could strengthen your readiness.`;

  return applyAudienceFilter(
    {
      status: "ready",
      context: "career_readiness",
      confidenceLevel: confidence,
      summary,
      reasons,
      missingSignals: missing,
      audience,
    },
    audience
  );
}
