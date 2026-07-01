import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──

export type EnrollmentStatus = "enrolled" | "active" | "completed" | "cancelled" | "dropped";
export type EnrollmentSource = "self" | "school" | "pathway";

export interface TrainingEnrollment {
  id: string;
  teacher_id: string;
  item_id: string;
  item_type: string;
  enrollment_source: EnrollmentSource;
  assignment_id: string | null;
  pathway_enrollment_id: string | null;
  status: EnrollmentStatus;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentWithDetails extends TrainingEnrollment {
  item_title: string;
  item_slug: string;
}

// ── Hook: Fetch teacher's enrollments with item details ──

export function useTeacherEnrollments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teacher_enrollments", user?.id],
    queryFn: async (): Promise<EnrollmentWithDetails[]> => {
      if (!user) return [];

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return [];

      const { data: enrollments, error } = await supabase
        .from("training_enrollments")
        .select("*")
        .eq("teacher_id", tp.id)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      if (!enrollments || enrollments.length === 0) return [];

      // Batch-resolve item titles
      const itemIds = [...new Set(enrollments.map((e) => e.item_id))];
      const { data: items } = await supabase
        .from("training_items")
        .select("id, title, slug")
        .in("id", itemIds);

      const itemMap: Record<string, { title: string; slug: string }> = {};
      items?.forEach((i) => (itemMap[i.id] = { title: i.title, slug: i.slug }));

      return enrollments.map((e) => ({
        ...e,
        status: e.status as EnrollmentStatus,
        enrollment_source: e.enrollment_source as EnrollmentSource,
        item_title: itemMap[e.item_id]?.title ?? "Unknown",
        item_slug: itemMap[e.item_id]?.slug ?? "",
      }));
    },
    enabled: !!user,
  });
}

// ── Hook: Check if teacher is already enrolled in an item ──

export function useEnrollmentStatus(itemId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["enrollment_status", user?.id, itemId],
    queryFn: async (): Promise<TrainingEnrollment | null> => {
      if (!user || !itemId) return null;

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return null;

      const { data, error } = await supabase
        .from("training_enrollments")
        .select("*")
        .eq("teacher_id", tp.id)
        .eq("item_id", itemId)
        .in("status", ["enrolled", "active"])
        .maybeSingle();

      if (error) throw error;
      return data as TrainingEnrollment | null;
    },
    enabled: !!user && !!itemId,
  });
}

// ── Hook: Self-enroll into a training item ──

export function useSelfEnroll() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: string }) => {
      const { data, error } = await supabase.functions.invoke("training-enrollments", {
        method: "POST",
        body: { item_id: itemId, item_type: itemType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_enrollments"] });
      qc.invalidateQueries({ queryKey: ["enrollment_status"] });
      qc.invalidateQueries({ queryKey: ["teacher_executions"] });
    },
  });
}

// ── Hook: Start learning (activate enrollment + execution) ──

export function useStartLearning() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase.functions.invoke("training-enrollments", {
        method: "PATCH",
        body: { id: enrollmentId, action: "start" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_enrollments"] });
      qc.invalidateQueries({ queryKey: ["enrollment_status"] });
      qc.invalidateQueries({ queryKey: ["teacher_executions"] });
      qc.invalidateQueries({ queryKey: ["course_progress"] });
    },
  });
}
