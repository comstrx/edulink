import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──

export type ExecutionStatus = "assigned" | "active" | "completed" | "cancelled";

export interface TrainingExecution {
  id: string;
  assignment_id: string;
  school_id: string;
  teacher_id: string;
  training_item_id: string;
  training_item_type: string;
  execution_status: ExecutionStatus;
  activated_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionWithDetails extends TrainingExecution {
  item_title: string;
  item_slug: string;
  due_date: string | null;
  assignment_notes: string | null;
}

// ── Hook: Fetch teacher's executions with item details ──

export function useTeacherExecutions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teacher_executions", user?.id],
    queryFn: async (): Promise<ExecutionWithDetails[]> => {
      if (!user) return [];

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return [];

      // Fetch executions
      const { data: executions, error } = await supabase
        .from("training_executions")
        .select("*")
        .eq("teacher_id", tp.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!executions || executions.length === 0) return [];

      // Batch-resolve item titles and assignment details
      const itemIds = [...new Set(executions.map((e) => e.training_item_id))];
      const assignmentIds = [...new Set(executions.map((e) => e.assignment_id))];

      const [itemsRes, assignmentsRes] = await Promise.all([
        supabase.from("training_items").select("id, title, slug").in("id", itemIds),
        supabase.from("training_assignments").select("id, due_date, notes").in("id", assignmentIds),
      ]);

      const itemMap: Record<string, { title: string; slug: string }> = {};
      itemsRes.data?.forEach((i) => (itemMap[i.id] = { title: i.title, slug: i.slug }));

      const assignmentMap: Record<string, { due_date: string | null; notes: string | null }> = {};
      assignmentsRes.data?.forEach((a) => (assignmentMap[a.id] = { due_date: a.due_date, notes: a.notes }));

      return executions.map((e) => ({
        ...e,
        execution_status: e.execution_status as ExecutionStatus,
        item_title: itemMap[e.training_item_id]?.title ?? "Unknown",
        item_slug: itemMap[e.training_item_id]?.slug ?? "",
        due_date: assignmentMap[e.assignment_id]?.due_date ?? null,
        assignment_notes: assignmentMap[e.assignment_id]?.notes ?? null,
      }));
    },
    enabled: !!user,
  });
}

// ── Hook: Activate execution ──

export function useActivateExecution() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke("training-executions", {
        method: "PATCH",
        body: { id: executionId, action: "activate" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_executions"] });
      qc.invalidateQueries({ queryKey: ["teacher_assignments"] });
    },
  });
}
