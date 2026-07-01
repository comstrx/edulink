import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";

// ── Types ──

export type PathwayExecutionStatus = "enrolled" | "active" | "completed" | "cancelled" | "dropped";
export type MilestoneStatus = "locked" | "available" | "completed";

export interface PathwayMilestoneProgress {
  id: string;
  execution_id: string;
  milestone_id: string;
  milestone_title: string;
  milestone_order: number;
  linked_course_ids: string[];
  status: MilestoneStatus;
  completed_at: string | null;
}

export interface PathwayCourseDetail {
  id: string;
  title: string;
  completed: boolean;
  progress_percent: number;
  progress_status: string;
}

export interface PathwayExecutionWithDetails {
  id: string;
  teacher_id: string;
  pathway_id: string;
  enrollment_id: string;
  status: PathwayExecutionStatus;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Enriched
  pathway_title: string;
  pathway_slug: string;
  cri_target: number | null;
  milestones: PathwayMilestoneProgress[];
  courses: PathwayCourseDetail[];
  completed_courses_count: number;
  remaining_courses_count: number;
  total_courses_count: number;
  completed_milestones_count: number;
  total_milestones_count: number;
  computed_progress_percent: number;
}

// ── Hook: Fetch teacher's pathway executions ──

export function usePathwayExecutions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pathway_executions", user?.id],
    queryFn: async (): Promise<PathwayExecutionWithDetails[]> => {
      if (!user) return [];

      const { data, error } = await supabase.functions.invoke("pathway-runtime", {
        method: "GET",
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data ?? [];
    },
    enabled: !!user,
  });
}

// ── Hook: Start a pathway (create pathway execution) ──

export function useStartPathway() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase.functions.invoke("pathway-runtime", {
        method: "POST",
        body: { enrollment_id: enrollmentId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pathway_executions"] });
      qc.invalidateQueries({ queryKey: ["teacher_enrollments"] });
      qc.invalidateQueries({ queryKey: ["teacher_executions"] });
    },
  });
}

// ── Hook: Refresh pathway progress ──

export function useRefreshPathwayProgress() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke("pathway-runtime", {
        method: "PATCH",
        body: { execution_id: executionId, action: "refresh_progress" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ["pathway_executions"] });
      qc.invalidateQueries({ queryKey: ["teacher_enrollments"] });
      qc.invalidateQueries({ queryKey: ["teacher_executions"] });
      qc.invalidateQueries({ queryKey: ["course_progress"] });
      // Ensure dashboard intelligence surfaces reflect pathway progress
      qc.invalidateQueries({ queryKey: ["intelligence_talent_profile"] });
      qc.invalidateQueries({ queryKey: ["teacher_cri_snapshot"] });
      qc.invalidateQueries({ queryKey: ["unified_recommendations"] });
      qc.invalidateQueries({ queryKey: ["growth_summary"] });

      // Sprint 9.6: Dispatch pathway.progress_updated on every refresh
      if (result?.execution) {
        const exec = result.execution;
        dispatchDomainEvent("training", EVENT_NAMES.training.pathwayProgressUpdated, {
          teacherId: exec.teacher_id,
          pathwayId: exec.pathway_id,
          pathwayExecutionId: exec.id,
          previousPercent: 0, // not tracked pre-refresh
          newPercent: result.progress_percent ?? 0,
          completedCourses: result.completed_courses_count ?? 0,
          totalCourses: result.total_courses_count ?? 0,
          completedMilestones: result.completed_milestones_count ?? 0,
          totalMilestones: result.total_milestones_count ?? 0,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }

      // Pre-Sprint 10: Dispatch pathway.completed when edge fn confirms completion
      if (result?.completed && result?.execution) {
        const exec = result.execution;
        dispatchDomainEvent("training", EVENT_NAMES.training.pathwayCompleted, {
          teacherId: exec.teacher_id,
          pathwayId: exec.pathway_id,
          pathwayExecutionId: exec.id,
          enrollmentId: exec.enrollment_id,
          completedAt: exec.completed_at ?? new Date().toISOString(),
        }).catch(() => {});
      }
    },
  });
}
