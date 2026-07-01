import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { logDispatchFailure } from "@/smart-glue/dispatch-failure-logger";

export type CourseProgressStatus = "not_started" | "in_progress" | "completed";

export interface CourseProgressRecord {
  id: string;
  execution_id: string;
  assignment_id: string;
  school_id: string;
  teacher_id: string;
  course_id: string;
  progress_status: CourseProgressStatus;
  progress_percent: number | null;
  started_at: string | null;
  first_activity_at: string | null;
  last_activity_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // enriched
  course_title: string;
  course_slug: string;
  due_date: string | null;
  assignment_notes: string | null;
}

export type CourseProgressAction = "start" | "continue" | "complete";

interface CompleteData {
  courseId: string;
  teacherId: string;
  newlyCompleted: boolean;
}

/**
 * Calls the course-progress edge function and normalizes its typed error shape
 * (`{ error: { code, message } }` returned with a non-2xx status) into a thrown
 * Error carrying the human-readable message.
 */
async function invokeCourseProgress<T>(
  method: "GET" | "PATCH",
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("course-progress", { method, body });
  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        message = parsed?.error?.message ?? message;
      } catch {
        // fall back to the transport-level message
      }
    }
    throw new Error(message);
  }
  return data as T;
}

export function useCourseProgressList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["course_progress", user?.id],
    queryFn: async (): Promise<CourseProgressRecord[]> => {
      if (!user) return [];
      const data = await invokeCourseProgress<{ data: CourseProgressRecord[] }>("GET");
      return data?.data ?? [];
    },
    enabled: !!user,
  });
}

export function useCourseProgressAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      executionId,
      action,
    }: {
      executionId: string;
      action: CourseProgressAction;
    }) => {
      return invokeCourseProgress<{ success: boolean; data?: CompleteData }>("PATCH", {
        execution_id: executionId,
        action,
      });
    },
    onSuccess: async (result, variables) => {
      qc.invalidateQueries({ queryKey: ["course_progress"] });
      qc.invalidateQueries({ queryKey: ["teacher_executions"] });

      if (variables.action !== "complete") return;

      // Sync enrollment-derived queries so hero CTA, Library, and MyLearning update.
      qc.invalidateQueries({ queryKey: ["teacher_enrollments"] });
      qc.invalidateQueries({ queryKey: ["enrollment_status"] });
      qc.invalidateQueries({ queryKey: ["training-completions"] });
      qc.invalidateQueries({ queryKey: ["earned-credentials"] });
      qc.invalidateQueries({ queryKey: ["prof_rep_training"] });
      qc.invalidateQueries({ queryKey: ["career_growth_training"] });
      qc.invalidateQueries({ queryKey: ["career_growth_credentials"] });

      // Identity comes from the server response now — no client-side re-query of
      // course_progress (audit #12). Skill resolution + event emission ultimately
      // belong in a server worker (see delivery/02-TARGET_ARCHITECTURE.md); this
      // stays as a thin bridge until the queue exists.
      const completion = result?.data;
      if (!completion?.teacherId || !completion?.courseId) return;

      const { data: skillRows } = await supabase
        .from("teacher_skills")
        .select("skill_term_id")
        .eq("teacher_id", completion.teacherId);
      const skillIds = (skillRows ?? []).map((r) => r.skill_term_id);

      dispatchDomainEvent("training", EVENT_NAMES.training.completed, {
        teacherId: completion.teacherId,
        courseId: completion.courseId,
        completedAt: new Date().toISOString(),
        skillIds,
        evidenceType: "certificate" as const,
      }).catch((e) => logDispatchFailure(EVENT_NAMES.training.completed, e));
    },
  });
}
