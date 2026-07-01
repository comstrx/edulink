import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──

export interface PathwayReflection {
  id: string;
  execution_id: string;
  teacher_id: string;
  prompt_id: string;
  prompt_text: string;
  teacher_response: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

// ── Hook: Fetch reflections for a pathway execution ──

export function usePathwayReflections(executionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pathway_reflections", user?.id, executionId],
    queryFn: async (): Promise<PathwayReflection[]> => {
      if (!user || !executionId) return [];

      const { data, error } = await supabase.functions.invoke("pathway-reflections", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const all: PathwayReflection[] = data?.data ?? [];
      return all.filter((r) => r.execution_id === executionId);
    },
    enabled: !!user && !!executionId,
  });
}

// ── Hook: Submit a reflection ──

export function useSubmitReflection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      executionId: string;
      promptId: string;
      promptText: string;
      teacherResponse: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("pathway-reflections", {
        method: "POST",
        body: {
          execution_id: params.executionId,
          prompt_id: params.promptId,
          prompt_text: params.promptText,
          teacher_response: params.teacherResponse,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pathway_reflections"] });
    },
  });
}
