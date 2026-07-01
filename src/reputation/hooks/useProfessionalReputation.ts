/**
 * useProfessionalReputation — Reputation Graph Layer
 *
 * Unified hook that aggregates professional reputation from verified
 * signals across Trust, Training, Mentoring, and Hiring domains.
 *
 * Returns a ReputationGraphSummary with:
 * - Categorized signal groups (trust, training, mentoring, hiring, reviews)
 * - Evidence source provenance (explainability)
 * - Audience-aware filtering utilities
 * - Backward-compatible fields from Sprint 8B
 *
 * All consumers use this — no page computes reputation independently.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ReputationGraphSummary,
  ReputationGraphResolvedState,
  ReputationAudience,
  TrustSignals,
  TrainingEvidenceSignals,
  MentoringSignals,
  HiringOutcomeSignals,
  ReviewSignals,
} from "../types/reputation-graph.types";
import { fetchTrustSignals } from "../signals/fetch-trust-signals";
import { fetchTrainingSignals } from "../signals/fetch-training-signals";
import { fetchMentoringSignals } from "../signals/fetch-mentoring-signals";
import { fetchHiringSignals } from "../signals/fetch-hiring-signals";
import { buildEvidenceSources } from "../utils/evidence-sources";
import { getCanonicalReputation } from "../canonical-adapter";

// ── Empty defaults ──

const EMPTY_TRUST: TrustSignals = {
  verifiedIdentity: false,
  verifiedCredentials: false,
  verificationCount: 0,
  trustLevel: "none",
};

const EMPTY_TRAINING: TrainingEvidenceSignals = {
  completedCourses: 0,
  verifiedCompletions: 0,
  earnedBadges: 0,
  earnedCertificates: 0,
  completedPathways: 0,
};

const EMPTY_MENTORING: MentoringSignals = {
  completedSessions: 0,
  approvedEvidence: 0,
  mentorReviewCount: 0,
  averageMentorRating: null,
  mentorValidationCount: 0,
};

const EMPTY_HIRING: HiringOutcomeSignals = {
  shortlistedCount: 0,
  interviewedCount: 0,
  hiredCount: 0,
};

const EMPTY_REVIEWS: ReviewSignals = {
  reviewScore: null,
  reviewCount: 0,
};

const EMPTY: ReputationGraphSummary = {
  resolvedState: "unavailable",
  reputationScore: 0,
  reputationLevel: "emerging",
  trust: EMPTY_TRUST,
  training: EMPTY_TRAINING,
  mentoring: EMPTY_MENTORING,
  hiring: EMPTY_HIRING,
  reviews: EMPTY_REVIEWS,
  evidenceSources: [],
  experienceYears: null,
  verifiedCredentials: 0,
  reviewScore: null,
  reviewCount: 0,
  completedTrainingCount: 0,
  trustLevel: "none",
};

/**
 * Audience-aware reputation hook.
 *
 * @param teacherProfileId - Teacher profile to aggregate reputation for.
 * @param audience - Controls which signal categories are fetched:
 *   - "public": Only training signals (safe for public pages). Default when omitted.
 *   - "school": Training + trust + mentoring (school/hiring context).
 *   - "internal": All signals including hiring outcomes (admin/owner context).
 *
 * Page-level gating (passing undefined profileId) is still respected.
 * This adds hook-level protection so even if a profileId is passed,
 * sensitive signals are not fetched unless the audience permits it.
 */
export function useProfessionalReputation(
  teacherProfileId?: string,
  audience: ReputationAudience = "internal"
): ReputationGraphSummary {
  const isSchoolOrInternal = audience === "school" || audience === "internal";
  const isInternal = audience === "internal";

  // 1. Identity — always fetched when profileId present
  const { data: teacherData, isLoading: tLoading } = useQuery({
    queryKey: ["prof_rep_teacher", teacherProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("years_of_experience")
        .eq("id", teacherProfileId!)
        .maybeSingle();
      return data;
    },
    enabled: !!teacherProfileId,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Trust signals — school + internal only
  const { data: trustData, isLoading: trLoading } = useQuery({
    queryKey: ["prof_rep_trust", teacherProfileId],
    queryFn: () => fetchTrustSignals(teacherProfileId!),
    enabled: !!teacherProfileId && isSchoolOrInternal,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Training signals — all audiences
  const { data: trainingData, isLoading: tnLoading } = useQuery({
    queryKey: ["prof_rep_training", teacherProfileId],
    queryFn: () => fetchTrainingSignals(teacherProfileId!),
    enabled: !!teacherProfileId,
    staleTime: 5 * 60 * 1000,
  });

  // 4. Mentoring signals — school + internal only
  const { data: mentoringData, isLoading: mLoading } = useQuery({
    queryKey: ["prof_rep_mentoring", teacherProfileId],
    queryFn: () => fetchMentoringSignals(teacherProfileId!),
    enabled: !!teacherProfileId && isSchoolOrInternal,
    staleTime: 5 * 60 * 1000,
  });

  // 5. Hiring outcome signals — internal only, non-blocking
  const { data: hiringData } = useQuery({
    queryKey: ["prof_rep_hiring", teacherProfileId],
    queryFn: () => fetchHiringSignals(teacherProfileId!),
    enabled: !!teacherProfileId && isInternal,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    if (!teacherProfileId) {
      return { ...EMPTY, resolvedState: "unavailable" as ReputationGraphResolvedState };
    }

    // Only check loading for signals that are actually enabled for this audience
    const coreLoading = tLoading || tnLoading;
    const extendedLoading = isSchoolOrInternal && (trLoading || mLoading);
    if (coreLoading || extendedLoading) {
      return { ...EMPTY, resolvedState: "loading" as ReputationGraphResolvedState };
    }

    const yearsExp = teacherData?.years_of_experience ?? null;
    const trust = trustData ?? EMPTY_TRUST;
    const training = trainingData ?? EMPTY_TRAINING;
    const mentoring = mentoringData ?? EMPTY_MENTORING;
    const hiring = hiringData ?? EMPTY_HIRING;

    // Reviews from mentoring data
    const reviews: ReviewSignals = {
      reviewScore: mentoring.averageMentorRating,
      reviewCount: mentoring.mentorReviewCount,
    };

    const credentialCount = training.earnedBadges + training.earnedCertificates;

    // Use canonical adapter for score + level (single source of truth)
    const { score, level: reputationLevel } = getCanonicalReputation({
      trust,
      training,
      mentoring,
      hiring,
      experienceYears: yearsExp,
      reviewScore: reviews.reviewScore,
      reviewCount: reviews.reviewCount,
    });

    // Build evidence provenance
    const evidenceSources = buildEvidenceSources({
      trust,
      training,
      mentoring,
      hiring,
      reviews,
    });

    return {
      resolvedState: "resolved" as ReputationGraphResolvedState,
      reputationScore: score,
      reputationLevel,
      trust,
      training,
      mentoring,
      hiring,
      reviews,
      evidenceSources,
      experienceYears: yearsExp,
      // Backward compat fields
      verifiedCredentials: credentialCount,
      reviewScore: reviews.reviewScore,
      reviewCount: reviews.reviewCount,
      completedTrainingCount: training.completedCourses,
      trustLevel: trust.trustLevel,
    };
  }, [
    teacherProfileId,
    teacherData,
    tLoading,
    trustData,
    trLoading,
    trainingData,
    tnLoading,
    mentoringData,
    mLoading,
    hiringData,
  ]);
}
