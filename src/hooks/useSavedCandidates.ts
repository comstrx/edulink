import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Manages the saved_candidates table for discovery-layer "Save" actions.
 * Returns a Set of saved teacher_profile_ids and toggle/check helpers.
 */
export function useSavedCandidates() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["saved_candidates", user?.id];

  const { data: savedIds = new Set<string>(), isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_candidates")
        .select("teacher_profile_id")
        .eq("school_user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((r) => r.teacher_profile_id));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (teacherProfileId: string) => {
      if (savedIds.has(teacherProfileId)) {
        const { error } = await supabase
          .from("saved_candidates")
          .delete()
          .eq("school_user_id", user!.id)
          .eq("teacher_profile_id", teacherProfileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_candidates")
          .insert({ school_user_id: user!.id, teacher_profile_id: teacherProfileId });
        if (error) throw error;
      }
    },
    onMutate: async (teacherProfileId) => {
      await qc.cancelQueries({ queryKey });
      const prev = new Set(savedIds);
      qc.setQueryData(queryKey, () => {
        const next = new Set(savedIds);
        if (next.has(teacherProfileId)) next.delete(teacherProfileId);
        else next.add(teacherProfileId);
        return next;
      });
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(queryKey, context.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    savedIds,
    isLoading,
    isSaved: (id: string) => savedIds.has(id),
    toggleSave: (id: string) => toggleMutation.mutate(id),
  };
}
