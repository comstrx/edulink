/**
 * useInterviews — Data access hooks for the interviews table.
 *
 * Phase 4.3A — Minimal interview scheduling data layer.
 *
 * Interviews are linked to applications and support three statuses:
 * scheduled, completed, cancelled.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createHiringSignal } from "@/lib/hiring-signals";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { logDispatchFailure } from "@/smart-glue/dispatch-failure-logger";

/* ── Types ── */

export type InterviewStatus = "scheduled" | "completed" | "cancelled";

export interface InterviewRow {
  id: string;
  application_id: string;
  teacher_id: string;
  job_id: string;
  scheduled_at: string;
  meeting_link: string | null;
  notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInterviewInput {
  applicationId: string;
  teacherId: string;
  jobId: string;
  scheduledAt: string; // ISO timestamp
  meetingLink?: string;
  notes?: string;
}

export interface UpdateInterviewInput {
  interviewId: string;
  scheduledAt?: string;
  meetingLink?: string;
  notes?: string;
  status?: InterviewStatus;
}

/* ── Queries ── */

/** Fetch all interviews for a specific application */
export function useInterviewsByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["interviews", "by-application", applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("application_id", applicationId!)
        .order("scheduled_at", { ascending: true })
        .returns<InterviewRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Fetch upcoming scheduled interviews for the current teacher */
export function useTeacherUpcomingInterviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["interviews", "teacher-upcoming", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Resolve teacher profile ID
      const { data: profile } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!profile) return [];

      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("teacher_id", profile.id)
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .returns<InterviewRow[]>();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000, // 1 min
  });
}

/** Fetch all interviews for a specific job (school view) */
export function useInterviewsByJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ["interviews", "by-job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("job_id", jobId!)
        .order("scheduled_at", { ascending: true })
        .returns<InterviewRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Mutations ── */

/** Create a new interview */
export function useCreateInterview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateInterviewInput) => {
      const { error } = await supabase.from("interviews").insert({
        application_id: input.applicationId,
        teacher_id: input.teacherId,
        job_id: input.jobId,
        scheduled_at: input.scheduledAt,
        meeting_link: input.meetingLink || null,
        notes: input.notes || null,
        status: "scheduled",
        created_by: user?.id ?? "",
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: "Interview scheduled" });
      qc.invalidateQueries({ queryKey: ["interviews"] });
      console.info("[interviews] interview_created", {
        applicationId: vars.applicationId,
        teacherId: vars.teacherId,
        jobId: vars.jobId,
      });

      // Signal: interview_scheduled (fire-and-forget)
      createHiringSignal({
        signalType: "interview_scheduled",
        actorType: "school",
        actorId: user?.id,
        applicationId: vars.applicationId,
        teacherId: vars.teacherId,
        jobId: vars.jobId,
      });

      // Sprint 1: Dispatch via Smart Glue for intelligence refresh
      dispatchDomainEvent("hiring", EVENT_NAMES.hiring.interviewScheduled, {
        applicationId: vars.applicationId,
        teacherId: vars.teacherId,
        jobId: vars.jobId,
        scheduledAt: vars.scheduledAt,
      }).catch((e) => logDispatchFailure(EVENT_NAMES.hiring.interviewScheduled, e));
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Failed to schedule interview.",
        variant: "destructive",
      });
    },
  });
}

/** Update an existing interview */
export function useUpdateInterview() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateInterviewInput) => {
      const payload: Partial<Pick<InterviewRow, "scheduled_at" | "meeting_link" | "notes" | "status">> = {};
      if (input.scheduledAt !== undefined) payload.scheduled_at = input.scheduledAt;
      if (input.meetingLink !== undefined) payload.meeting_link = input.meetingLink;
      if (input.notes !== undefined) payload.notes = input.notes;
      if (input.status !== undefined) payload.status = input.status;

      const { error } = await supabase
        .from("interviews")
        .update(payload)
        .eq("id", input.interviewId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      const label = vars.status === "cancelled" ? "Interview cancelled" : "Interview updated";
      toast({ title: label });
      qc.invalidateQueries({ queryKey: ["interviews"] });
      console.info("[interviews] interview_updated", {
        interviewId: vars.interviewId,
        status: vars.status,
      });

      // Signal: interview_cancelled or interview_updated (fire-and-forget)
      if (vars.status === "cancelled") {
        createHiringSignal({
          signalType: "interview_cancelled",
          actorType: "school",
          interviewId: vars.interviewId,
          metadata: vars.notes ? { notes: vars.notes } : undefined,
        });
      } else {
        createHiringSignal({
          signalType: "interview_updated",
          actorType: "school",
          interviewId: vars.interviewId,
          metadata: {
            ...(vars.scheduledAt ? { scheduledAt: vars.scheduledAt } : {}),
            ...(vars.meetingLink !== undefined ? { meetingLinkChanged: true } : {}),
          },
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update interview.",
        variant: "destructive",
      });
    },
  });
}

/** Cancel an interview (convenience wrapper) */
export function useCancelInterview() {
  const updateMutation = useUpdateInterview();

  return {
    ...updateMutation,
    mutate: (interviewId: string) =>
      updateMutation.mutate({ interviewId, status: "cancelled" }),
  };
}
