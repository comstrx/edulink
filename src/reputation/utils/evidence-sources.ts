/**
 * Evidence Source Builder — Reputation Graph Layer
 *
 * Builds the list of evidence sources that contributed to the
 * current reputation state. Ensures explainability.
 */

import type {
  EvidenceSource,
  TrustSignals,
  TrainingEvidenceSignals,
  MentoringSignals,
  HiringOutcomeSignals,
  ReviewSignals,
} from "../types/reputation-graph.types";

export function buildEvidenceSources(input: {
  trust: TrustSignals;
  training: TrainingEvidenceSignals;
  mentoring: MentoringSignals;
  hiring: HiringOutcomeSignals;
  reviews: ReviewSignals;
}): EvidenceSource[] {
  const sources: EvidenceSource[] = [];

  if (input.trust.verificationCount > 0) {
    sources.push({
      kind: "trust_verification",
      label: "Verified trust signals",
      count: input.trust.verificationCount,
    });
  }

  if (input.training.completedCourses > 0) {
    sources.push({
      kind: "training_completion",
      label: "Completed training courses",
      count: input.training.completedCourses,
    });
  }

  if (input.training.earnedBadges + input.training.earnedCertificates > 0) {
    sources.push({
      kind: "earned_credential",
      label: "Earned credentials",
      count: input.training.earnedBadges + input.training.earnedCertificates,
    });
  }

  if (input.training.completedPathways > 0) {
    sources.push({
      kind: "pathway_completion",
      label: "Completed pathways",
      count: input.training.completedPathways,
    });
  }

  if (input.mentoring.completedSessions > 0) {
    sources.push({
      kind: "mentor_session",
      label: "Completed mentoring sessions",
      count: input.mentoring.completedSessions,
    });
  }

  if (input.mentoring.mentorValidationCount > 0) {
    sources.push({
      kind: "mentor_validation",
      label: "Mentor-validated evidence",
      count: input.mentoring.mentorValidationCount,
    });
  }

  if (input.reviews.reviewCount > 0) {
    sources.push({
      kind: "mentor_review_rating",
      label: "Session review ratings",
      count: input.reviews.reviewCount,
    });
  }

  if (input.hiring.shortlistedCount > 0) {
    sources.push({
      kind: "hiring_shortlisted",
      label: "Shortlisted for positions",
      count: input.hiring.shortlistedCount,
    });
  }

  if (input.hiring.interviewedCount > 0) {
    sources.push({
      kind: "hiring_interviewed",
      label: "Interview invitations",
      count: input.hiring.interviewedCount,
    });
  }

  if (input.hiring.hiredCount > 0) {
    sources.push({
      kind: "hiring_placed",
      label: "Successful placements",
      count: input.hiring.hiredCount,
    });
  }

  return sources;
}
