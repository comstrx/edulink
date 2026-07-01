/**
 * Teacher Fit Explanation Deriver
 *
 * Explains why a teacher appears suitable for opportunities.
 * Sprint 2.2: Consumes GrowthSummary (intelligence-only) + ReputationGraphSummary.
 *
 * IMPORTANT: teacher_fit represents general professional suitability.
 * It is NOT job-specific fit.
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

export function deriveTeacherFitExplanation(
  growth: GrowthSummary,
  reputation: ReputationGraphSummary,
  audience: ExplanationAudience
): ExplanationContract {
  if (growth.resolvedState !== "resolved") {
    return {
      status: growth.resolvedState === "loading" ? "loading" : "unavailable",
      context: "teacher_fit",
      confidenceLevel: "low",
      summary: "Loading teacher fit data…",
      reasons: [],
      missingSignals: [],
      audience,
    };
  }

  const reasons: ExplanationReason[] = [];
  const missing: MissingSignal[] = [];

  // Credentials (primary signal) — from intelligence
  if (growth.growthSignals.credentialsReady) {
    reasons.push({
      label: `${growth.hiringSignals.credentialCount} earned credential(s)`,
      sourceDomain: "training",
      signalType: "credential",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      signalCount: growth.hiringSignals.credentialCount,
      verificationBasis: "earned_credentials",
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Earned credentials",
      sourceDomain: "training",
      signalType: "credential",
      hint: "Complete training to earn verifiable credentials.",
      visibility: ["public", "school", "internal"],
    });
  }

  // Training activity (primary signal) — from intelligence
  if (growth.growthSignals.trainingActive) {
    reasons.push({
      label: `${growth.hiringSignals.trainingCompleted} training(s) completed`,
      sourceDomain: "training",
      signalType: "training_completion",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      signalCount: growth.hiringSignals.trainingCompleted,
      verificationBasis: "training_completions",
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Active training",
      sourceDomain: "training",
      signalType: "training_enrollment",
      hint: "Enroll in training to demonstrate professional development.",
      visibility: ["public", "school", "internal"],
    });
  }

  // Trust verification — from reputation
  if (reputation.trust.verifiedIdentity) {
    reasons.push({
      label: "Identity verified",
      sourceDomain: "trust",
      signalType: "verification",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      verificationBasis: "account_verifications",
    });
  } else {
    missing.push({
      label: "Identity verification",
      sourceDomain: "trust",
      signalType: "verification",
      hint: "Verify your identity to build trust with schools.",
      visibility: ["school", "internal"],
    });
  }

  if (reputation.trust.verifiedCredentials) {
    reasons.push({
      label: "Credentials verified",
      sourceDomain: "trust",
      signalType: "verification",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      verificationBasis: "account_verifications",
    });
  }

  // Mentoring (school/internal only)
  if (reputation.mentoring.completedSessions > 0) {
    reasons.push({
      label: `${reputation.mentoring.completedSessions} mentor session(s) completed`,
      sourceDomain: "mentoring",
      signalType: "mentor_session",
      evidenceStatus: "verified",
      visibility: ["school", "internal"],
      signalCount: reputation.mentoring.completedSessions,
      verificationBasis: "mentor_sessions",
    });
  }

  if (reputation.mentoring.mentorValidationCount > 0) {
    reasons.push({
      label: `${reputation.mentoring.mentorValidationCount} mentor validation(s)`,
      sourceDomain: "mentoring",
      signalType: "mentor_validation",
      evidenceStatus: "verified",
      visibility: ["school", "internal"],
      signalCount: reputation.mentoring.mentorValidationCount,
      verificationBasis: "mentor_reviews",
    });
  }

  // Reputation level
  if (reputation.resolvedState === "resolved" && reputation.reputationLevel !== "emerging") {
    reasons.push({
      label: `Reputation: ${reputation.reputationLevel}`,
      sourceDomain: "reputation",
      signalType: "reputation_level",
      evidenceStatus: "derived",
      visibility: ["public", "school", "internal"],
    });
  }

  // Hiring outcomes (internal only)
  if (reputation.hiring.hiredCount > 0) {
    reasons.push({
      label: `${reputation.hiring.hiredCount} successful placement(s)`,
      sourceDomain: "hiring",
      signalType: "hiring_outcome",
      evidenceStatus: "verified",
      visibility: ["internal"],
      signalCount: reputation.hiring.hiredCount,
      verificationBasis: "applications",
    });
  }

  const confidence = deriveConfidence(reasons, missing);
  const readyCount = [
    growth.growthSignals.credentialsReady,
    growth.growthSignals.trainingActive,
  ].filter(Boolean).length;

  const summary =
    readyCount === 2
      ? "Strong professional profile with verified evidence across key areas."
      : readyCount === 1
        ? "Developing professional profile with supporting evidence."
        : "Limited professional evidence available.";

  return applyAudienceFilter(
    {
      status: "ready",
      context: "teacher_fit",
      confidenceLevel: confidence,
      summary,
      reasons,
      missingSignals: missing,
      audience,
    },
    audience
  );
}
