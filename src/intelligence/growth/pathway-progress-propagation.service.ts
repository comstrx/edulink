/**
 * Pathway Progress Propagation Service
 *
 * When a course that belongs to a pathway is completed,
 * this service checks if any milestone's linked courses are
 * all completed, and if so marks that milestone as completed.
 *
 * Reads real data from pathway_milestone_progress and training_completions.
 * Never fakes or invents progress.
 *
 * Sprint 4 — Phase 2, Step 3: Pathway Completion Propagation
 */

import { supabase } from "@/integrations/supabase/client";

export interface PathwayPropagationResult {
  teacherId: string;
  courseId: string;
  pathwayId: string | null;
  milestonesCompleted: string[];
  success: boolean;
  error?: string;
}

/**
 * When a course is completed, check if it belongs to any active pathway
 * execution for this teacher. If so, evaluate milestone completion.
 */
export async function propagatePathwayProgress(
  teacherId: string,
  courseId: string,
): Promise<PathwayPropagationResult> {
  try {
    // 1. Find active pathway executions for this teacher
    const { data: executions, error: execErr } = await supabase
      .from("pathway_executions")
      .select("id, pathway_id, status")
      .eq("teacher_id", teacherId)
      .in("status", ["active"]);

    if (execErr || !executions?.length) {
      return { teacherId, courseId, pathwayId: null, milestonesCompleted: [], success: true };
    }

    const completedMilestones: string[] = [];
    let matchedPathwayId: string | null = null;

    for (const exec of executions) {
      // 2. Find milestones in this execution that reference the completed course
      const { data: milestones, error: msErr } = await supabase
        .from("pathway_milestone_progress")
        .select("id, milestone_id, linked_course_ids, status")
        .eq("execution_id", exec.id)
        .eq("status", "available")
        .contains("linked_course_ids", [courseId]);

      if (msErr || !milestones?.length) continue;

      matchedPathwayId = exec.pathway_id;

      for (const milestone of milestones) {
        const linkedIds = milestone.linked_course_ids ?? [];
        if (linkedIds.length === 0) continue;

        // 3. Check if ALL linked courses in this milestone are completed
        const { data: completions, error: compErr } = await supabase
          .from("training_completions")
          .select("source_id")
          .eq("teacher_id", teacherId)
          .in("source_id", linkedIds);

        if (compErr) continue;

        const completedIds = new Set((completions ?? []).map((c) => c.source_id));
        const allDone = linkedIds.every((id: string) => completedIds.has(id));

        if (allDone) {
          // 4. Mark milestone as completed (respects DB trigger validation)
          const { error: updateErr } = await supabase
            .from("pathway_milestone_progress")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", milestone.id)
            .eq("status", "available");

          if (!updateErr) {
            completedMilestones.push(milestone.milestone_id);
          }
        }
      }

      // 5. After completing milestones, recalculate pathway progress_percent
      if (completedMilestones.length > 0) {
        const { data: allMilestones } = await supabase
          .from("pathway_milestone_progress")
          .select("id, status")
          .eq("execution_id", exec.id);

        if (allMilestones && allMilestones.length > 0) {
          const total = allMilestones.length;
          const done = allMilestones.filter((m) => m.status === "completed").length;
          const percent = Math.round((done / total) * 100);

          await supabase
            .from("pathway_executions")
            .update({ progress_percent: percent })
            .eq("id", exec.id);
        }
      }
    }

    return {
      teacherId,
      courseId,
      pathwayId: matchedPathwayId,
      milestonesCompleted: completedMilestones,
      success: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      teacherId,
      courseId,
      pathwayId: null,
      milestonesCompleted: [],
      success: false,
      error: msg,
    };
  }
}
