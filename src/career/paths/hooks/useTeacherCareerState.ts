/**
 * useTeacherCareerState — Sprint 8A
 *
 * Hook to load the teacher's evaluated career state
 * and associated path/stage metadata.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherCareerStateView {
  currentPathName: string | null;
  currentStageName: string | null;
  currentStageOrder: number | null;
  nextStageName: string | null;
  nextStageOrder: number | null;
  totalStages: number;
  readinessPercent: number;
  unmetRequirementCount: number;
  satisfiedRequirementCount: number;
  totalRequirementCount: number;
  evaluationTrace: Record<string, unknown>;
  computedAt: string | null;
}

export function useTeacherCareerState(teacherId: string | undefined) {
  return useQuery({
    queryKey: ["teacher_career_state", teacherId],
    queryFn: async (): Promise<TeacherCareerStateView | null> => {
      if (!teacherId) return null;

      // Load career state
      const { data: state } = await supabase
        .from("teacher_career_states")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (!state) return null;

      // Load path/stage names
      const [pathRes, currentStageRes, nextStageRes, stagesCountRes] = await Promise.all([
        state.current_path_id
          ? supabase.from("career_paths").select("name").eq("id", state.current_path_id).maybeSingle()
          : Promise.resolve({ data: null }),
        state.current_stage_id
          ? supabase.from("career_stages").select("name, stage_order").eq("id", state.current_stage_id).maybeSingle()
          : Promise.resolve({ data: null }),
        state.next_stage_id
          ? supabase.from("career_stages").select("name, stage_order").eq("id", state.next_stage_id).maybeSingle()
          : Promise.resolve({ data: null }),
        state.current_path_id
          ? supabase.from("career_stages").select("id").eq("path_id", state.current_path_id).eq("is_active", true)
          : Promise.resolve({ data: [] }),
      ]);

      return {
        currentPathName: pathRes.data?.name ?? null,
        currentStageName: currentStageRes.data?.name ?? null,
        currentStageOrder: currentStageRes.data?.stage_order ?? null,
        nextStageName: nextStageRes.data?.name ?? null,
        nextStageOrder: nextStageRes.data?.stage_order ?? null,
        totalStages: stagesCountRes.data?.length ?? 0,
        readinessPercent: Number(state.readiness_percent) || 0,
        unmetRequirementCount: state.unmet_requirement_count,
        satisfiedRequirementCount: state.satisfied_requirement_count,
        totalRequirementCount: state.total_requirement_count,
        evaluationTrace: (state.evaluation_trace as Record<string, unknown>) ?? {},
        computedAt: state.computed_at,
      };
    },
    enabled: !!teacherId,
  });
}
