/**
 * Audience-Based Reputation Filter — Reputation Graph Layer
 *
 * Filters reputation signals by audience boundary:
 * - public: verified credentials, training completions, reputation level
 * - school: adds mentor validation, trust, career readiness
 * - internal: full detail including hiring outcomes and evidence sources
 *
 * Never exposes private signals publicly.
 */

import type {
  ReputationGraphSummary,
  PublicReputationView,
  SchoolReputationView,
  InternalReputationView,
  ReputationAudience,
} from "../types/reputation-graph.types";

export function getPublicReputationView(
  summary: ReputationGraphSummary
): PublicReputationView {
  return {
    reputationLevel: summary.reputationLevel,
    verifiedCredentials: summary.verifiedCredentials,
    completedTrainings: summary.training.completedCourses,
    completedPathways: summary.training.completedPathways,
  };
}

export function getSchoolReputationView(
  summary: ReputationGraphSummary
): SchoolReputationView {
  return {
    ...getPublicReputationView(summary),
    mentorValidationCount: summary.mentoring.mentorValidationCount,
    averageMentorRating: summary.mentoring.averageMentorRating,
    trustLevel: summary.trust.trustLevel,
    completedSessions: summary.mentoring.completedSessions,
  };
}

export function getInternalReputationView(
  summary: ReputationGraphSummary
): InternalReputationView {
  return {
    ...getSchoolReputationView(summary),
    hiringOutcomes: summary.hiring,
    reviewSignals: summary.reviews,
    evidenceSources: summary.evidenceSources,
    reputationScore: summary.reputationScore,
  };
}

export function getReputationViewByAudience(
  summary: ReputationGraphSummary,
  audience: ReputationAudience
): PublicReputationView | SchoolReputationView | InternalReputationView {
  switch (audience) {
    case "public":
      return getPublicReputationView(summary);
    case "school":
      return getSchoolReputationView(summary);
    case "internal":
      return getInternalReputationView(summary);
  }
}
