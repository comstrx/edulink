import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { fetchSavedJobs, type SavedJobRow } from "@/lib/supabase-typed-queries";

const QUERY_KEY = "saved_jobs";

export function useSavedJobs() {
  const { data: teacherId } = useTeacherProfileId();

  return useQuery({
    queryKey: [QUERY_KEY, teacherId],
    enabled: !!teacherId,
    queryFn: async (): Promise<SavedJobRow[]> => {
      return fetchSavedJobs(teacherId!);
    },
  });
}

export function useSavedJobIds() {
  const { data: teacherId } = useTeacherProfileId();

  const { data: ids = new Set<string>(), isLoading } = useQuery({
    queryKey: [QUERY_KEY, "ids", teacherId],
    enabled: !!teacherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("teacher_id", teacherId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.job_id));
    },
  });

  return { savedJobIds: ids, isLoading };
}

export function useToggleSaveJob() {
  const { data: teacherId } = useTeacherProfileId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => {
      if (!teacherId) throw new Error("No teacher profile");
      if (isSaved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("teacher_id", teacherId)
          .eq("job_id", jobId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_jobs")
          .insert({ teacher_id: teacherId, job_id: jobId });
        if (error && error.code !== "23505") throw error;
      }
    },
    onMutate: async ({ jobId, isSaved }) => {
      await qc.cancelQueries({ queryKey: [QUERY_KEY] });
      const prev = qc.getQueryData<Set<string>>([QUERY_KEY, "ids", teacherId]);
      if (prev) {
        const next = new Set(prev);
        if (isSaved) next.delete(jobId); else next.add(jobId);
        qc.setQueryData([QUERY_KEY, "ids", teacherId], next);
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData([QUERY_KEY, "ids", teacherId], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
