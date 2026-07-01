import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MentorSessionStatus = "requested" | "confirmed" | "scheduled" | "completed" | "cancelled" | "declined" | "no_show";

export interface MentorSession {
  id: string;
  mentor_id: string;
  teacher_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: MentorSessionStatus;
  notes: string | null;
  session_type: string;
  created_at: string;
}

export interface MentorAvailabilitySlot {
  id: string;
  mentor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// Teacher's sessions
export function useTeacherMentorSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentor_sessions", "teacher", user?.id],
    queryFn: async (): Promise<MentorSession[]> => {
      if (!user) return [];

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return [];

      const { data, error } = await supabase
        .from("mentor_sessions")
        .select("id, mentor_id, teacher_id, scheduled_at, duration_minutes, status, notes, session_type, created_at")
        .eq("teacher_id", tp.id)
        .order("scheduled_at", { ascending: false })
        .returns<MentorSession[]>();

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

// Mentor's sessions
export function useMentorOwnSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentor_sessions", "mentor", user?.id],
    queryFn: async (): Promise<MentorSession[]> => {
      if (!user) return [];

      const { data: mentor } = await supabase
        .from("mentors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mentor) return [];

      const { data, error } = await supabase
        .from("mentor_sessions")
        .select("id, mentor_id, teacher_id, scheduled_at, duration_minutes, status, notes, session_type, created_at")
        .eq("mentor_id", mentor.id)
        .order("scheduled_at", { ascending: false })
        .returns<MentorSession[]>();

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

// Mentor availability
export function useMentorAvailability(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["mentor_availability", mentorId],
    queryFn: async (): Promise<MentorAvailabilitySlot[]> => {
      if (!mentorId) return [];

      const { data, error } = await supabase
        .from("mentor_availability")
        .select("id, mentor_id, day_of_week, start_time, end_time, is_active")
        .eq("mentor_id", mentorId)
        .eq("is_active", true)
        .order("day_of_week")
        .returns<MentorAvailabilitySlot[]>();

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!mentorId,
  });
}

// Schedule a session (legacy — prefer useRequestMentorSession from useMentorBooking)
export function useScheduleMentorSession() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      mentor_id: string;
      scheduled_at: string;
      duration_minutes?: number;
      notes?: string;
      session_type?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) throw new Error("No teacher profile");

      const { data, error } = await supabase
        .from("mentor_sessions")
        .insert({
          mentor_id: payload.mentor_id,
          teacher_id: tp.id,
          scheduled_at: payload.scheduled_at,
          duration_minutes: payload.duration_minutes ?? 60,
          notes: payload.notes ?? null,
          session_type: payload.session_type ?? "general",
          status: "requested",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor_sessions"] });
      qc.invalidateQueries({ queryKey: ["mentor_booked_slots"] });
    },
  });
}

// Update session status
export function useUpdateMentorSessionStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: MentorSessionStatus; notes?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const update: { status: string; notes?: string } = { status };
      if (notes !== undefined) update.notes = notes;

      const { error } = await supabase
        .from("mentor_sessions")
        .update(update)
        .eq("id", id)
        .select("id");

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor_sessions"] });
      qc.invalidateQueries({ queryKey: ["mentor_booked_slots"] });
    },
  });
}

// Manage availability
export function useUpdateMentorAvailability() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (slots: Omit<MentorAvailabilitySlot, "id" | "mentor_id">[]) => {
      if (!user) throw new Error("Not authenticated");

      const { data: mentor } = await supabase
        .from("mentors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mentor) throw new Error("No mentor profile");

      // Deactivate all existing, then insert new
      await supabase
        .from("mentor_availability")
        .update({ is_active: false })
        .eq("mentor_id", mentor.id);

      if (slots.length > 0) {
        const { error } = await supabase
          .from("mentor_availability")
          .insert(slots.map((s) => ({ ...s, mentor_id: mentor.id })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor_availability"] });
    },
  });
}
