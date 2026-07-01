import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MentorReviewDecision } from "@/contracts/training/mentor.contracts";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";

// ── Types ──

export interface MentorReview {
  id: string;
  mentor_id: string;
  teacher_id: string;
  execution_id: string;
  evidence_id: string;
  review_decision: MentorReviewDecision;
  review_notes: string | null;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
}

// ── Hook: Fetch reviews for teacher's evidence ──

export function useTeacherMentorReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentor_reviews", "teacher", user?.id],
    queryFn: async (): Promise<MentorReview[]> => {
      if (!user) return [];

      const { data, error } = await supabase.functions.invoke("mentor-review", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data ?? [];
    },
    enabled: !!user,
  });
}

// ── Hook: Fetch mentor's review queue ──

export function useMentorReviewQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentor_reviews", "queue", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.functions.invoke("mentor-review", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      // Pass query params via URL workaround - fetch queue separately
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mentor-review?role=mentor&queue=pending`);
      const res = await fetch(url.toString(), {
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch queue");
      }

      const result = await res.json();
      return result?.data ?? [];
    },
    enabled: !!user,
  });
}

// ── Hook: Fetch mentor's completed reviews ──

export function useMentorCompletedReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentor_reviews", "completed", user?.id],
    queryFn: async (): Promise<MentorReview[]> => {
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mentor-review?role=mentor`);
      const res = await fetch(url.toString(), {
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch reviews");
      }

      const result = await res.json();
      return result?.data ?? [];
    },
    enabled: !!user,
  });
}

// ── Hook: Submit a review ──

export function useSubmitMentorReview() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      evidenceId: string;
      reviewDecision: MentorReviewDecision;
      reviewNotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("mentor-review", {
        method: "POST",
        body: {
          evidence_id: params.evidenceId,
          review_decision: params.reviewDecision,
          review_notes: params.reviewNotes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["mentor_reviews"] });
      qc.invalidateQueries({ queryKey: ["training_evidence"] });
      // Cross-domain: refresh reputation & growth after evidence review
      qc.invalidateQueries({ queryKey: ["prof_rep_training"] });
      qc.invalidateQueries({ queryKey: ["prof_rep_mentoring"] });
      qc.invalidateQueries({ queryKey: ["career_growth_training"] });
      qc.invalidateQueries({ queryKey: ["career_growth_credentials"] });

      // Sprint 9.5-C: Resolve full payload from edge fn response + DB fallback
      if (variables.reviewDecision === "approved" && variables.evidenceId) {
        const reviewRow = _data?.data;
        let teacherId: string | undefined = reviewRow?.teacher_id;
        let mentorId: string | undefined = reviewRow?.mentor_id;
        let executionId: string | undefined = reviewRow?.execution_id;
        let reviewId: string | undefined = reviewRow?.id;

        // Fallback: resolve from DB if edge fn response is incomplete
        if (!teacherId || !mentorId || !executionId) {
          try {
            const { data: evidence } = await supabase
              .from("training_evidence")
              .select("teacher_id, execution_id")
              .eq("id", variables.evidenceId)
              .maybeSingle();
            teacherId = teacherId || evidence?.teacher_id;
            executionId = executionId || evidence?.execution_id;
          } catch (lookupErr) {
            console.warn("[Reaction] evidence_approved SKIPPED — lookup failed", lookupErr);
          }
        }

        if (teacherId) {
          // Sprint 9.5-C: Fixed — all payload fields populated correctly
          dispatchDomainEvent("training", EVENT_NAMES.training.mentorReviewApproved, {
            mentorId: mentorId ?? "unknown",
            teacherId,
            evidenceId: variables.evidenceId,
            executionId: executionId ?? "unknown",
            reviewId: reviewId ?? "unknown",
            approvedAt: new Date().toISOString(),
          }).catch(() => {});

          // Sprint 9.6: Dispatch verified_completion — evidence approval is the verified growth signal
          if (executionId && executionId !== "unknown" && mentorId) {
            dispatchDomainEvent("training", EVENT_NAMES.training.verifiedCompletion, {
              teacherId,
              executionId,
              mentorId: mentorId ?? "unknown",
              verifiedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        } else {
          console.warn(
            `[Reaction] evidence_approved SKIPPED — could not resolve teacher for evidence=${variables.evidenceId}`,
          );
        }
      }
    },
  });
}
