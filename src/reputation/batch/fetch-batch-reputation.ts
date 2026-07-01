/**
 * Batch Reputation Fetcher — Canonical Graph Model
 *
 * Fetches reputation signals for multiple teachers in batch using the SAME
 * scoring (computeScore) and level derivation (deriveReputationGraphLevel)
 * as useProfessionalReputation.
 *
 * This ensures Talent Search shows the same reputation score + level
 * as CandidatePanel and MentorProfile.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  TrustSignals,
  TrainingEvidenceSignals,
  MentoringSignals,
  HiringOutcomeSignals,
  ReputationGraphLevel,
} from "../types/reputation-graph.types";
import { computeCanonicalReputationScore, deriveReputationGraphLevel } from "../canonical-adapter";

export interface BatchReputationEntry {
  reputationScore: number;
  reputationLevel: ReputationGraphLevel;
  credentialCount: number;
  trainingCount: number;
}

export type BatchReputationMap = Record<string, BatchReputationEntry>;

/**
 * Fetch canonical reputation for a batch of teachers.
 *
 * Queries the same source tables as useProfessionalReputation but in batch,
 * then uses the same computeScore + deriveReputationGraphLevel for consistency.
 */
export async function fetchBatchReputation(
  teacherIds: string[],
  teacherExperience: Record<string, number | null>,
): Promise<BatchReputationMap> {
  if (teacherIds.length === 0) return {};

  // ── Parallel batch queries (same tables as canonical hook) ──
  const [
    profilesRes,
    verificationsRes,
    credentialsRes,
    completionsRes,
    pathwaysRes,
    sessionsRes,
    evidenceRes,
    mentorReviewsRes,
    applicationsRes,
  ] = await Promise.all([
    // 1. user_ids for trust lookup
    supabase
      .from("teacher_profiles")
      .select("id, user_id")
      .in("id", teacherIds),
    // 2. account_verifications (trust)
    supabase
      .from("account_verifications")
      .select("account_id, verification_type")
      .eq("status", "approved"),
    // 3. earned_credentials
    supabase
      .from("earned_credentials")
      .select("teacher_id, credential_kind")
      .eq("status", "active")
      .in("teacher_id", teacherIds),
    // 4. training_completions
    supabase
      .from("training_completions")
      .select("teacher_id, verified_completion")
      .in("teacher_id", teacherIds),
    // 5. pathway_executions
    supabase
      .from("pathway_executions")
      .select("teacher_id")
      .eq("status", "completed")
      .in("teacher_id", teacherIds),
    // 6. mentor_sessions (completed)
    supabase
      .from("mentor_sessions")
      .select("id, teacher_id")
      .eq("status", "completed")
      .in("teacher_id", teacherIds),
    // 7. mentor_session_evidence (approved)
    supabase
      .from("mentor_session_evidence")
      .select("teacher_id")
      .eq("status", "approved")
      .in("teacher_id", teacherIds),
    // 8. mentor_reviews (approved)
    supabase
      .from("mentor_reviews")
      .select("teacher_id")
      .eq("review_decision", "approved")
      .in("teacher_id", teacherIds),
    // 9. applications (hiring outcomes)
    supabase
      .from("applications")
      .select("teacher_id, status")
      .in("teacher_id", teacherIds),
  ]);

  // ── Build user_id → teacher_id map for trust lookups ──
  const userToTeacher: Record<string, string> = {};
  const teacherToUser: Record<string, string> = {};
  for (const p of profilesRes.data ?? []) {
    if (p.user_id) {
      userToTeacher[p.user_id] = p.id;
      teacherToUser[p.id] = p.user_id;
    }
  }

  // ── Group data by teacher_id ──
  const trustByTeacher: Record<string, TrustSignals> = {};
  const verifications = verificationsRes.data ?? [];
  // Filter verifications to only relevant user_ids
  const relevantUserIds = new Set(Object.values(teacherToUser));
  for (const tid of teacherIds) {
    const userId = teacherToUser[tid];
    if (!userId) {
      trustByTeacher[tid] = { verifiedIdentity: false, verifiedCredentials: false, verificationCount: 0, trustLevel: "none" };
      continue;
    }
    const teacherVerifs = verifications.filter((v) => v.account_id === userId);
    const types = new Set(teacherVerifs.map((v) => v.verification_type));
    const count = teacherVerifs.length;
    let trustLevel: TrustSignals["trustLevel"] = "none";
    if (count >= 4) trustLevel = "full";
    else if (count >= 2) trustLevel = "enhanced";
    else if (count >= 1) trustLevel = "basic";
    trustByTeacher[tid] = {
      verifiedIdentity: types.has("teacher_identity"),
      verifiedCredentials: types.has("credential_verification"),
      verificationCount: count,
      trustLevel,
    };
  }

  // Training signals per teacher
  const trainingByTeacher: Record<string, TrainingEvidenceSignals> = {};
  const credentials = credentialsRes.data ?? [];
  const completions = completionsRes.data ?? [];
  const pathways = pathwaysRes.data ?? [];
  for (const tid of teacherIds) {
    const tCreds = credentials.filter((c) => c.teacher_id === tid);
    const tComps = completions.filter((c) => c.teacher_id === tid);
    const tPaths = pathways.filter((p) => p.teacher_id === tid);
    trainingByTeacher[tid] = {
      completedCourses: tComps.length,
      verifiedCompletions: tComps.filter((c: any) => c.verified_completion).length,
      earnedBadges: tCreds.filter((c: any) => c.credential_kind === "badge").length,
      earnedCertificates: tCreds.filter((c: any) => c.credential_kind === "certificate").length,
      completedPathways: tPaths.length,
    };
  }

  // Mentoring signals per teacher
  const mentoringByTeacher: Record<string, MentoringSignals> = {};
  const sessions = sessionsRes.data ?? [];
  const evidence = evidenceRes.data ?? [];
  const mentorRevs = mentorReviewsRes.data ?? [];
  for (const tid of teacherIds) {
    const tSessions = sessions.filter((s) => s.teacher_id === tid);
    const tEvidence = evidence.filter((e) => e.teacher_id === tid);
    const tMentorRevs = mentorRevs.filter((r) => r.teacher_id === tid);
    const approvedEvidence = tEvidence.length;
    mentoringByTeacher[tid] = {
      completedSessions: tSessions.length,
      approvedEvidence,
      mentorReviewCount: 0, // Review ratings not batch-fetched (minor contribution)
      averageMentorRating: null,
      mentorValidationCount: (tMentorRevs.length) + approvedEvidence,
    };
  }

  // Hiring signals per teacher
  const hiringByTeacher: Record<string, HiringOutcomeSignals> = {};
  const apps = applicationsRes.data ?? [];
  for (const tid of teacherIds) {
    const tApps = apps.filter((a) => a.teacher_id === tid);
    hiringByTeacher[tid] = {
      shortlistedCount: tApps.filter((a) => a.status === "shortlisted").length,
      interviewedCount: tApps.filter((a) => a.status === "interview" || a.status === "offer").length,
      hiredCount: tApps.filter((a) => a.status === "hired").length,
    };
  }

  // ── Compute score + level using canonical functions ──
  const result: BatchReputationMap = {};
  for (const tid of teacherIds) {
    const trust = trustByTeacher[tid];
    const training = trainingByTeacher[tid];
    const mentoring = mentoringByTeacher[tid];
    const hiring = hiringByTeacher[tid];
    const yearsExp = teacherExperience[tid] ?? null;
    const credentialCount = training.earnedBadges + training.earnedCertificates;

    const score = computeCanonicalReputationScore({
      yearsExp,
      credentialCount,
      trainingCount: training.verifiedCompletions,
      verificationCount: trust.verificationCount,
      reviewScore: null, // Batch doesn't fetch individual review ratings
      reviewCount: 0,
      mentoringValidations: mentoring.mentorValidationCount,
      completedSessions: mentoring.completedSessions,
      hiredCount: hiring.hiredCount,
    });

    const level = deriveReputationGraphLevel({
      trust,
      training,
      mentoring,
      hiring,
      experienceYears: yearsExp,
    });

    if (score > 0) {
      result[tid] = {
        reputationScore: score,
        reputationLevel: level,
        credentialCount,
        trainingCount: training.completedCourses,
      };
    }
  }

  return result;
}
