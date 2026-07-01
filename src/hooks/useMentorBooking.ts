/**
 * useMentorBooking — Slot generation and session booking hooks.
 * Sprint B2-B: Mentor Booking Engine
 * Hardened: Atomic session completion via DB RPC
 *
 * Sprint 7C: Fixed query key invalidation to match all session query variants.
 */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { SessionOutcome } from "@/contracts/training/mentorship-evidence.contracts";
import { dispatchDomainEvent } from "@/smart-glue/bridge";

// ── Types ──

export interface GeneratedSlot {
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isoStart: string;
  isoEnd: string;
}

export type BookingSessionStatus = "requested" | "confirmed" | "scheduled" | "completed" | "cancelled" | "declined" | "no_show";

export interface BookingSession {
  id: string;
  mentor_id: string;
  teacher_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: BookingSessionStatus;
  notes: string | null;
  session_type: string;
  created_at: string;
  updated_at: string;
}

// ── Shared invalidation helper ──

function invalidateAllSessionQueries(qc: ReturnType<typeof useQueryClient>) {
  // Invalidate all mentor_sessions query variants (teacher, mentor, dashboard)
  qc.invalidateQueries({ queryKey: ["mentor_sessions"] });
  qc.invalidateQueries({ queryKey: ["mentor_booked_slots"] });
}

// ── Slot Generation ──

const DEFAULT_SLOT_DURATION = 60;
const LOOKAHEAD_DAYS = 14;

export function useMentorSlots(mentorId: string | undefined) {
  const { data: availability } = useQuery({
    queryKey: ["mentor_availability", mentorId],
    queryFn: async () => {
      if (!mentorId) return [];
      const { data, error } = await supabase
        .from("mentor_availability")
        .select("day_of_week, start_time, end_time")
        .eq("mentor_id", mentorId)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!mentorId,
  });

  const { data: existingSessions } = useQuery({
    queryKey: ["mentor_booked_slots", mentorId],
    queryFn: async () => {
      if (!mentorId) return [];
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + LOOKAHEAD_DAYS);

      const { data, error } = await supabase
        .from("mentor_sessions")
        .select("scheduled_at, duration_minutes, status")
        .eq("mentor_id", mentorId)
        .gte("scheduled_at", now.toISOString())
        .lte("scheduled_at", futureDate.toISOString())
        .in("status", ["requested", "confirmed", "scheduled"]);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!mentorId,
  });

  const slots = useMemo(() => {
    if (!availability?.length) return [];

    const now = new Date();
    const generated: GeneratedSlot[] = [];

    const bookedRanges = (existingSessions ?? []).map((s: any) => {
      const start = new Date(s.scheduled_at).getTime();
      const end = start + (s.duration_minutes ?? DEFAULT_SLOT_DURATION) * 60 * 1000;
      return { start, end };
    });

    for (let dayOffset = 0; dayOffset < LOOKAHEAD_DAYS; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();

      const patterns = availability.filter((a: any) => a.day_of_week === dayOfWeek);

      for (const pattern of patterns) {
        const [startH, startM] = pattern.start_time.split(":").map(Number);
        const [endH, endM] = pattern.end_time.split(":").map(Number);

        const patternStartMin = startH * 60 + startM;
        const patternEndMin = endH * 60 + endM;

        for (let slotStart = patternStartMin; slotStart + DEFAULT_SLOT_DURATION <= patternEndMin; slotStart += DEFAULT_SLOT_DURATION) {
          const slotStartDate = new Date(date);
          slotStartDate.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);

          if (slotStartDate.getTime() <= now.getTime()) continue;

          const slotEndDate = new Date(slotStartDate);
          slotEndDate.setMinutes(slotEndDate.getMinutes() + DEFAULT_SLOT_DURATION);

          const slotStartMs = slotStartDate.getTime();
          const slotEndMs = slotEndDate.getTime();
          const isBooked = bookedRanges.some(
            (b: { start: number; end: number }) => slotStartMs < b.end && slotEndMs > b.start
          );

          if (!isBooked) {
            generated.push({
              date: slotStartDate.toISOString().split("T")[0],
              dayOfWeek,
              startTime: `${String(Math.floor(slotStart / 60)).padStart(2, "0")}:${String(slotStart % 60).padStart(2, "0")}`,
              endTime: `${String(Math.floor((slotStart + DEFAULT_SLOT_DURATION) / 60)).padStart(2, "0")}:${String((slotStart + DEFAULT_SLOT_DURATION) % 60).padStart(2, "0")}`,
              isoStart: slotStartDate.toISOString(),
              isoEnd: slotEndDate.toISOString(),
            });
          }
        }
      }
    }

    return generated;
  }, [availability, existingSessions]);

  return { slots, isLoading: !availability };
}

// ── Book a Session ──

export function useRequestMentorSession() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      mentor_id: string;
      scheduled_at: string;
      duration_minutes?: number;
      notes?: string;
      session_type?: string;
      training_execution_id?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) throw new Error("No teacher profile found");

      const scheduledAt = new Date(payload.scheduled_at);
      const duration = payload.duration_minutes ?? DEFAULT_SLOT_DURATION;
      const endAt = new Date(scheduledAt.getTime() + duration * 60 * 1000);

      const { data: overlapping } = await supabase
        .from("mentor_sessions")
        .select("id")
        .eq("mentor_id", payload.mentor_id)
        .in("status", ["requested", "confirmed", "scheduled"])
        .gte("scheduled_at", new Date(scheduledAt.getTime() - duration * 60 * 1000).toISOString())
        .lte("scheduled_at", endAt.toISOString());

      if (overlapping && overlapping.length > 0) {
        throw new Error("This time slot is no longer available. Please select another.");
      }

      const insertPayload: any = {
        mentor_id: payload.mentor_id,
        teacher_id: tp.id,
        scheduled_at: payload.scheduled_at,
        duration_minutes: duration,
        notes: payload.notes ?? null,
        session_type: payload.session_type ?? "general",
        status: "requested",
      };

      if (payload.training_execution_id) {
        insertPayload.training_execution_id = payload.training_execution_id;
      }

      const { data, error } = await supabase
        .from("mentor_sessions")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllSessionQueries(qc);
    },
  });
}

// ── Mentor: Manage Sessions ──

export function useMentorSessionActions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const confirmSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("mentor_sessions")
        .update({ status: "confirmed" } as any)
        .eq("id", sessionId)
        .eq("status", "requested");
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllSessionQueries(qc);
    },
  });

  const declineSession = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const update: any = { status: "declined" };
      if (reason) update.notes = reason;
      const { error } = await supabase
        .from("mentor_sessions")
        .update(update)
        .eq("id", sessionId)
        .eq("status", "requested");
      if (error) throw error;
    },
    onSuccess: () => {
      // Decline frees the slot — invalidate booked slots too
      invalidateAllSessionQueries(qc);
    },
  });

  /**
   * Atomic session completion via DB RPC.
   * All outcome fields + status change happen in one transaction.
   * Domain event emitted only on success.
   */
  const completeSessionWithOutcome = useMutation({
    mutationFn: async (params: {
      sessionId: string;
      sessionOutcome: SessionOutcome;
      mentorSummary: string;
      recommendedNextStep?: string;
      competencyTermIds?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc(
        "complete_mentor_session_with_outcome" as any,
        {
          p_session_id: params.sessionId,
          p_mentor_user_id: user.id,
          p_session_outcome: params.sessionOutcome,
          p_mentor_summary: params.mentorSummary,
          p_recommended_next_step: params.recommendedNextStep ?? null,
          p_competency_term_ids: params.competencyTermIds ?? null,
        }
      );

      if (error) throw error;

      // Sprint 9.5-A: Single canonical path via Smart Glue
      const result = data as any;
      dispatchDomainEvent("training", EVENT_NAMES.mentorship.sessionCompleted, {
        sessionId: result.sessionId,
        mentorId: result.mentorId,
        teacherId: result.teacherId,
        durationMinutes: result.durationMinutes,
        trainingExecutionId: result.trainingExecutionId ?? undefined,
      }).catch(() => {});

      return result;
    },
    onSuccess: () => {
      invalidateAllSessionQueries(qc);
      // Cross-domain: session completion affects reputation and growth signals
      qc.invalidateQueries({ queryKey: ["prof_rep_mentoring"] });
      qc.invalidateQueries({ queryKey: ["career_growth_training"] });
    },
  });

  const cancelSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("mentor_sessions")
        .update({ status: "cancelled" } as any)
        .eq("id", sessionId)
        .in("status", ["requested", "confirmed"]);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllSessionQueries(qc);
    },
  });

  const markNoShow = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("mentor_sessions")
        .update({ status: "no_show" } as any)
        .eq("id", sessionId)
        .eq("status", "confirmed");
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllSessionQueries(qc);
    },
  });

  return { confirmSession, declineSession, completeSessionWithOutcome, cancelSession, markNoShow };
}

// ── Fetch Mentor's Own Sessions (for dashboard) ──

export function useMentorDashboardSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentor_sessions", "dashboard", user?.id],
    queryFn: async (): Promise<(BookingSession & { teacher_name?: string })[]> => {
      if (!user) return [];

      const { data: mentor } = await supabase
        .from("mentors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mentor) return [];

      const { data: sessions, error } = await supabase
        .from("mentor_sessions")
        .select("*")
        .eq("mentor_id", mentor.id)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      if (!sessions?.length) return [];

      const teacherIds = [...new Set(sessions.map((s: any) => s.teacher_id))];
      const { data: teachers } = await supabase
        .from("teacher_profiles")
        .select("id, full_name")
        .in("id", teacherIds);

      const nameMap: Record<string, string> = {};
      (teachers ?? []).forEach((t: any) => { nameMap[t.id] = t.full_name; });

      return sessions.map((s: any) => ({
        ...s,
        teacher_name: nameMap[s.teacher_id] ?? "Teacher",
      }));
    },
    enabled: !!user,
  });
}

// ── Check if current user is a mentor ──

export function useIsMentor() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is_mentor", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("mentors")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
}
