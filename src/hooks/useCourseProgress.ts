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

export function useCourseProgressList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["course_progress", user?.id],
    queryFn: async (): Promise<CourseProgressRecord[]> => {
      if (!user) return [];

      const { data, error } = await supabase.functions.invoke("course-progress", {
        method: "GET",
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data ?? [];
    },
    enabled: !!user,
  });
}

export function useCourseProgressAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ executionId, action }: { executionId: string; action: "start" | "continue" | "complete" }) => {
      const { data, error } = await supabase.functions.invoke("course-progress", {
        method: "PATCH",
        body: { execution_id: executionId, action },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["course_progress"] });
      qc.invalidateQueries({ queryKey: ["teacher_executions"] });

      // Sync enrollment queries on completion so hero CTA, Library, and MyLearning update
      if (variables.action === "complete") {
        qc.invalidateQueries({ queryKey: ["teacher_enrollments"] });
        qc.invalidateQueries({ queryKey: ["enrollment_status"] });
        qc.invalidateQueries({ queryKey: ["training-completions"] });
        qc.invalidateQueries({ queryKey: ["earned-credentials"] });
        // Cross-domain: refresh reputation & growth so widgets update immediately
        qc.invalidateQueries({ queryKey: ["prof_rep_training"] });
        qc.invalidateQueries({ queryKey: ["career_growth_training"] });
        qc.invalidateQueries({ queryKey: ["career_growth_credentials"] });
      }

      // Sprint 4.5: Resolve teacher_id via direct DB lookup, not cache
      if (variables.action === "complete" && variables.executionId) {
        try {
          const { data: cpRow } = await supabase
            .from("course_progress")
            .select("teacher_id, course_id")
            .eq("execution_id", variables.executionId)
            .maybeSingle();

          if (cpRow?.teacher_id && cpRow?.course_id) {
            // Sprint 9.5-C: Resolve skillIds from teacher_skills
            const { data: skillRows } = await supabase
              .from("teacher_skills")
              .select("skill_term_id")
              .eq("teacher_id", cpRow.teacher_id);
            const resolvedSkillIds = (skillRows ?? []).map((r: any) => r.skill_term_id);

            dispatchDomainEvent("training", EVENT_NAMES.training.completed, {
              teacherId: cpRow.teacher_id,
              courseId: cpRow.course_id,
              completedAt: new Date().toISOString(),
              skillIds: resolvedSkillIds,
              evidenceType: "certificate" as const,
            }).catch((e) => logDispatchFailure(EVENT_NAMES.training.completed, e));
          } else {
            console.warn(
              `[Reaction] course_completed SKIPPED — could not resolve teacher for execution=${variables.executionId}`,
            );
          }
        } catch (lookupErr) {
          console.warn("[Reaction] course_completed SKIPPED — lookup failed", lookupErr);
        }
      }
    },
  });
}
