/**
 * useTeacherExecutions — Fetch active training executions for the current teacher.
 * Used in booking UI to optionally link a mentor session to a training execution.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActiveExecution {
  id: string;
  training_item_id: string;
  training_item_type: string;
  execution_status: string;
  item_title: string;
}

export function useTeacherActiveExecutions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teacher_active_executions", user?.id],
    queryFn: async (): Promise<ActiveExecution[]> => {
      if (!user) return [];

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return [];

      const { data: executions, error } = await supabase
        .from("training_executions")
        .select("id, training_item_id, training_item_type, execution_status")
        .eq("teacher_id", tp.id)
        .in("execution_status", ["active", "assigned"]);

      if (error) throw error;
      if (!executions?.length) return [];

      // Resolve item titles
      const itemIds = [...new Set(executions.map((e: any) => e.training_item_id))];
      const { data: items } = await supabase
        .from("training_items")
        .select("id, title")
        .in("id", itemIds as string[]);

      const titleMap: Record<string, string> = {};
      (items ?? []).forEach((i) => { titleMap[i.id] = i.title; });

      return executions.map((e: any) => ({
        id: e.id,
        training_item_id: e.training_item_id,
        training_item_type: e.training_item_type,
        execution_status: e.execution_status,
        item_title: titleMap[e.training_item_id] ?? "Training Item",
      }));
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
