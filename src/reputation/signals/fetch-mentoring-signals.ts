/**
 * Mentoring Signal Fetcher — Reputation Graph Layer
 *
 * Reads mentor_sessions, mentor_session_evidence, mentor_session_reviews, mentor_reviews.
 * Mentoring is a first-class reputation signal.
 */

import { supabase } from "@/integrations/supabase/client";
import type { MentoringSignals } from "../types/reputation-graph.types";

export async function fetchMentoringSignals(
  teacherProfileId: string
): Promise<MentoringSignals> {
  // 1. Completed mentor sessions
  const { data: sessions } = await supabase
    .from("mentor_sessions")
    .select("id")
    .eq("teacher_id", teacherProfileId)
    .eq("status", "completed");

  const sessionIds = (sessions ?? []).map((s) => s.id);

  if (sessionIds.length === 0) {
    return {
      completedSessions: 0,
      approvedEvidence: 0,
      mentorReviewCount: 0,
      averageMentorRating: null,
      mentorValidationCount: 0,
    };
  }

  // 2. Approved mentorship evidence (mentor validated teacher's practice)
  const { count: approvedEvidenceCount } = await supabase
    .from("mentor_session_evidence")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherProfileId)
    .eq("status", "approved");

  // 3. Mentor session reviews (approved ratings from teacher about mentor)
  const { data: reviews } = await supabase
    .from("mentor_session_reviews")
    .select("rating")
    .eq("status", "approved")
    .in("session_id", sessionIds);

  const reviewList = (reviews ?? []) as Array<{ rating: number }>;
  const avgRating =
    reviewList.length > 0
      ? Math.round((reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length) * 10) / 10
      : null;

  // 4. Mentor reviews (mentor validated training evidence)
  const { count: mentorValidations } = await supabase
    .from("mentor_reviews")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherProfileId)
    .eq("review_decision", "approved");

  return {
    completedSessions: sessionIds.length,
    approvedEvidence: approvedEvidenceCount ?? 0,
    mentorReviewCount: reviewList.length,
    averageMentorRating: avgRating,
    mentorValidationCount: (mentorValidations ?? 0) + (approvedEvidenceCount ?? 0),
  };
}
