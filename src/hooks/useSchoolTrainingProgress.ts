import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

export interface TrainingProgressRow {
  school_id: string;
  item_id: string;
  item_type: string;
  item_title: string;
  assigned_count: number;
  started_count: number;
  completed_count: number;
  certified_count: number;
  cancelled_count: number;
}

export function useSchoolTrainingProgress() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["school_training_progress", schoolId],
    queryFn: async (): Promise<TrainingProgressRow[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("school_training_progress_view" as any)
        .select("*")
        .eq("school_id", schoolId);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        school_id: row.school_id,
        item_id: row.item_id,
        item_type: row.item_type,
        item_title: row.item_title,
        assigned_count: Number(row.assigned_count),
        started_count: Number(row.started_count),
        completed_count: Number(row.completed_count),
        certified_count: Number(row.certified_count),
        cancelled_count: Number(row.cancelled_count),
      }));
    },
    enabled: !!schoolId && !wsLoading,
  });
}
