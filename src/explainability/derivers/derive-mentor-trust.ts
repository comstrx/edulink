/**
 * Mentor Trust Explanation Deriver
 *
 * Explains why a mentor is considered trustworthy.
 * Consumes: ReputationGraphSummary (mentoring + trust signals)
 */

import type { ReputationGraphSummary } from "@/reputation/types/reputation-graph.types";
import type {
  ExplanationContract,
  ExplanationReason,
  MissingSignal,
  ExplanationAudience,
} from "../types/explanation-contract.types";
import { deriveConfidence } from "../utils/derive-confidence";
import { applyAudienceFilter } from "../utils/filter-by-audience";

export function deriveMentorTrustExplanation(
  reputation: ReputationGraphSummary,
  audience: ExplanationAudience
): ExplanationContract {
  if (reputation.resolvedState !== "resolved") {
    return {
      status: reputation.resolvedState === "loading" ? "loading" : "unavailable",
      context: "mentor_trust",
      confidenceLevel: "low",
      summary: "Loading mentor trust data…",
      reasons: [],
      missingSignals: [],
      audience,
    };
  }

  const reasons: ExplanationReason[] = [];
  const missing: MissingSignal[] = [];

  // Trust verification (primary)
  if (reputation.trust.verifiedIdentity) {
    reasons.push({
      label: "Verified identity",
      sourceDomain: "trust",
      signalType: "verification",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      verificationBasis: "account_verifications",
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Identity verification",
      sourceDomain: "trust",
      signalType: "verification",
      visibility: ["public", "school", "internal"],
    });
  }

  if (reputation.trust.verifiedCredentials) {
    reasons.push({
      label: "Verified credentials",
      sourceDomain: "trust",
      signalType: "verification",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      verificationBasis: "account_verifications",
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Credential verification",
      sourceDomain: "trust",
      signalType: "verification",
      visibility: ["school", "internal"],
    });
  }

  // Mentoring activity (primary)
  if (reputation.mentoring.completedSessions > 0) {
    reasons.push({
      label: `${reputation.mentoring.completedSessions} completed mentor session(s)`,
      sourceDomain: "mentoring",
      signalType: "mentor_session",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      signalCount: reputation.mentoring.completedSessions,
      verificationBasis: "mentor_sessions",
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Mentoring sessions",
      sourceDomain: "mentoring",
      signalType: "mentor_session",
      hint: "Complete mentoring sessions to build trust.",
      visibility: ["public", "school", "internal"],
    });
  }

  // Mentor reviews (school/internal)
  if (reputation.mentoring.mentorReviewCount > 0) {
    const ratingLabel = reputation.mentoring.averageMentorRating != null
      ? ` (avg ${reputation.mentoring.averageMentorRating.toFixed(1)})`
      : "";
    reasons.push({
      label: `${reputation.mentoring.mentorReviewCount} mentor review(s)${ratingLabel}`,
      sourceDomain: "mentoring",
      signalType: "mentor_review",
      evidenceStatus: "verified",
      visibility: ["school", "internal"],
      signalCount: reputation.mentoring.mentorReviewCount,
      verificationBasis: "mentor_session_reviews",
    });
  }

  // Mentor validation (school/internal)
  if (reputation.mentoring.mentorValidationCount > 0) {
    reasons.push({
      label: `${reputation.mentoring.mentorValidationCount} validated evidence submission(s)`,
      sourceDomain: "mentoring",
      signalType: "mentor_validation",
      evidenceStatus: "verified",
      visibility: ["school", "internal"],
      signalCount: reputation.mentoring.mentorValidationCount,
      verificationBasis: "mentor_reviews",
    });
  }

  // Training evidence (public-safe)
  if (reputation.training.verifiedCompletions > 0) {
    reasons.push({
      label: `${reputation.training.verifiedCompletions} verified training completion(s)`,
      sourceDomain: "training",
      signalType: "training_completion",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      signalCount: reputation.training.verifiedCompletions,
      verificationBasis: "training_completions",
    });
  }

  const confidence = deriveConfidence(reasons, missing);

  const trustIndicators = [
    reputation.trust.verifiedIdentity,
    reputation.trust.verifiedCredentials,
    reputation.mentoring.completedSessions > 0,
    reputation.mentoring.mentorReviewCount > 0,
  ].filter(Boolean).length;

  const summary =
    trustIndicators >= 4
      ? "Highly trusted mentor with verified credentials and strong review history."
      : trustIndicators >= 2
        ? "Trusted mentor with supporting evidence."
        : trustIndicators >= 1
          ? "Mentor with some trust signals. More evidence would strengthen confidence."
          : "Limited trust evidence available for this mentor.";

  return applyAudienceFilter(
    {
      status: "ready",
      context: "mentor_trust",
      confidenceLevel: confidence,
      summary,
      reasons,
      missingSignals: missing,
      audience,
    },
    audience
  );
}
