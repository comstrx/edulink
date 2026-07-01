/**
 * useMentorReputation — Session review submission, aggregation, and moderation hooks.
 * Sprint B2-C: Mentor Reputation System
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { logDispatchFailure } from "@/smart-glue/dispatch-failure-logger";

// ── Types ──

export interface MentorSessionReview {
  id: string;
  mentor_id: string;
  session_id: string;
  reviewer_user_id: string;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface MentorRatingAggregate {
  average_rating: number;
  review_count: number;
}

// ── Submit a session review ──

export function useSubmitSessionReview() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      mentor_id: string;
      session_id: string;
      rating: number;
      comment?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("mentor_session_reviews")
        .insert({
          mentor_id: payload.mentor_id,
          session_id: payload.session_id,
          reviewer_user_id: user.id,
          rating: payload.rating,
          comment: payload.comment?.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") throw new Error("You have already reviewed this session");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor_session_reviews"] });
      qc.invalidateQueries({ queryKey: ["mentor_rating"] });
      qc.invalidateQueries({ queryKey: ["mentor_directory"] });
    },
  });
}

// ── Fetch approved reviews for a mentor (public) ──

export function useMentorApprovedReviews(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["mentor_session_reviews", "approved", mentorId],
    queryFn: async (): Promise<MentorSessionReview[]> => {
      if (!mentorId) return [];
      const { data, error } = await supabase
        .from("mentor_session_reviews")
        .select("id, mentor_id, session_id, reviewer_user_id, rating, comment, status, created_at, updated_at")
        .eq("mentor_id", mentorId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as MentorSessionReview[];
    },
    enabled: !!mentorId,
  });
}

// ── Compute rating aggregate for a mentor (from approved reviews) ──

export function useMentorRating(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["mentor_rating", mentorId],
    queryFn: async (): Promise<MentorRatingAggregate> => {
      if (!mentorId) return { average_rating: 0, review_count: 0 };
      const { data, error } = await supabase
        .from("mentor_session_reviews")
        .select("rating")
        .eq("mentor_id", mentorId)
        .eq("status", "approved");
      if (error) throw error;
      const ratings = (data ?? []).map((r) => r.rating);
      if (ratings.length === 0) return { average_rating: 0, review_count: 0 };
      const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
      return { average_rating: Math.round(avg * 10) / 10, review_count: ratings.length };
    },
    enabled: !!mentorId,
  });
}

// ── Check if user can review a session ──

export function useCanReviewSession(sessionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["can_review_session", sessionId, user?.id],
    queryFn: async () => {
      if (!user || !sessionId) return false;

      // Check if review already exists
      const { data: existing } = await supabase
        .from("mentor_session_reviews")
        .select("id")
        .eq("session_id", sessionId)
        .eq("reviewer_user_id", user.id)
        .maybeSingle();

      if (existing) return false;

      // Check session is completed and user is the booking teacher
      const { data: session } = await supabase
        .from("mentor_sessions")
        .select("status, teacher_id")
        .eq("id", sessionId)
        .single();

      if (!session || session.status !== "completed") return false;

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      return tp?.id === session.teacher_id;
    },
    enabled: !!user && !!sessionId,
  });
}

// ── Teacher's completed sessions eligible for review ──

export function useReviewableCompletedSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reviewable_sessions", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return [];

      // Get completed sessions
      const { data: sessions } = await supabase
        .from("mentor_sessions")
        .select("id, mentor_id, scheduled_at, duration_minutes, session_type, notes")
        .eq("teacher_id", tp.id)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false })
        .limit(20);

      if (!sessions?.length) return [];

      // Check which already have reviews
      const sessionIds = sessions.map((s) => s.id);
      const { data: existingReviews } = await supabase
        .from("mentor_session_reviews")
        .select("session_id")
        .eq("reviewer_user_id", user.id)
        .in("session_id", sessionIds);

      const reviewedSet = new Set((existingReviews ?? []).map((r) => r.session_id));

      return sessions
        .filter((s) => !reviewedSet.has(s.id))
        .map((s) => ({ ...s, canReview: true }));
    },
    enabled: !!user,
  });
}

// ── Admin: All reviews for moderation ──

export function useAdminMentorReviews() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin" as any);

  return useQuery({
    queryKey: ["admin_mentor_session_reviews"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_session_reviews")
        .select("id, mentor_id, session_id, reviewer_user_id, rating, comment, status, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MentorSessionReview[];
    },
  });
}

// ── Admin: Moderate a review ──

export function useModerateSessionReview() {
  const { roles } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, status }: { reviewId: string; status: "approved" | "rejected" }) => {
      const isAdmin = roles.includes("admin" as any);
      if (!isAdmin) throw new Error("Only admins can moderate reviews");

      const { data, error } = await supabase
        .from("mentor_session_reviews")
        .update({ status })
        .eq("id", reviewId)
        .select("id, mentor_id, session_id, reviewer_user_id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin_mentor_session_reviews"] });
      qc.invalidateQueries({ queryKey: ["mentor_session_reviews"] });
      qc.invalidateQueries({ queryKey: ["mentor_rating"] });
      qc.invalidateQueries({ queryKey: ["mentor_directory"] });

      // Sprint 13: Dispatch admin signal through Smart Glue
      if (data) {
        const eventName = variables.status === "approved"
          ? EVENT_NAMES.admin.reviewApproved
          : EVENT_NAMES.admin.reviewRejected;

        const payload = variables.status === "approved"
          ? {
              reviewId: data.id,
              mentorId: data.mentor_id,
              sessionId: data.session_id,
              reviewerUserId: data.reviewer_user_id,
              approvedAt: new Date().toISOString(),
            }
          : {
              reviewId: data.id,
              mentorId: data.mentor_id,
              sessionId: data.session_id,
              reviewerUserId: data.reviewer_user_id,
              rejectedAt: new Date().toISOString(),
            };

        dispatchDomainEvent("admin", eventName, payload).catch((e) => logDispatchFailure(eventName, e));
      }
    },
  });
}

// ── Batch rating aggregates for directory (multiple mentors) ──

export function useMentorRatingsBatch(mentorIds: string[]) {
  return useQuery({
    queryKey: ["mentor_ratings_batch", mentorIds.sort().join(",")],
    queryFn: async (): Promise<Record<string, MentorRatingAggregate>> => {
      if (!mentorIds.length) return {};

      // Fetch both review types in parallel for unified aggregation
      const [sessionRes, evidenceRes] = await Promise.all([
        supabase
          .from("mentor_session_reviews")
          .select("mentor_id, rating")
          .in("mentor_id", mentorIds)
          .eq("status", "approved"),
        supabase
          .from("mentor_reviews")
          .select("mentor_id")
          .in("mentor_id", mentorIds)
          .eq("review_decision", "approved"),
      ]);

      // Session review ratings
      const ratingGrouped: Record<string, number[]> = {};
      (sessionRes.data ?? []).forEach((r) => {
        if (!ratingGrouped[r.mentor_id]) ratingGrouped[r.mentor_id] = [];
        ratingGrouped[r.mentor_id].push(r.rating);
      });

      // Evidence review counts
      const evidenceCounts: Record<string, number> = {};
      (evidenceRes.data ?? []).forEach((r) => {
        evidenceCounts[r.mentor_id] = (evidenceCounts[r.mentor_id] ?? 0) + 1;
      });

      const result: Record<string, MentorRatingAggregate> = {};
      for (const id of mentorIds) {
        const ratings = ratingGrouped[id] ?? [];
        const evidenceCount = evidenceCounts[id] ?? 0;
        const avg = ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;
        result[id] = {
          average_rating: Math.round(avg * 10) / 10,
          review_count: ratings.length + evidenceCount,
        };
      }
      return result;
    },
    enabled: mentorIds.length > 0,
    staleTime: 60_000,
  });
}
