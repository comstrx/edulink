/**
 * Supabase implementation of the CourseProgressRepository port.
 *
 * - Reads/simple writes use the RLS-scoped `user` client.
 * - `complete()` delegates to the atomic `complete_course_progress` RPC.
 * - `refreshPathwaysForCourse()` is the derived projection: it uses the pure
 *   `computePathwayProgress` policy to decide, then persists. It runs with the
 *   `admin` client (the pathway tables are recomputed server-side, not by the
 *   user) and is invoked best-effort by the service. In the target architecture
 *   this whole method becomes a queue worker.
 */

import type { PostgrestError, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { DomainError, Errors } from "../domain/errors.ts";
import { computePathwayProgress, type MilestoneInput } from "../domain/pathway-progress.policy.ts";
import type {
  CompleteResult,
  CourseProgressListItem,
  CourseProgressRepository,
  CourseProgressRow,
  ExecutionRef,
  Logger,
  StartCommand,
  TouchCommand,
} from "../application/ports.ts";

export function createCourseProgressRepository(
  user: SupabaseClient,
  admin: SupabaseClient,
  logger: Logger,
): CourseProgressRepository {
  return new SupabaseCourseProgressRepository(user, admin, logger);
}

class SupabaseCourseProgressRepository implements CourseProgressRepository {
  constructor(
    private readonly user: SupabaseClient,
    private readonly admin: SupabaseClient,
    private readonly logger: Logger,
  ) {}

  async listForTeacher(teacherId: string): Promise<CourseProgressListItem[]> {
    const { data, error } = await this.user
      .from("course_progress")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });
    if (error) throw Errors.internal(error.message);

    const rows = (data ?? []) as CourseProgressRow[];
    if (rows.length === 0) return [];

    const courseIds = unique(rows.map((r) => r.course_id));
    const assignmentIds = unique(rows.map((r) => r.assignment_id).filter(isNonNull));

    // Batch-resolve to avoid N+1 (audit #12 keeps the good parts of the original).
    const [courseMap, assignmentMap] = await Promise.all([
      this.loadCourses(courseIds),
      this.loadAssignments(assignmentIds),
    ]);

    return rows.map((r) => ({
      ...r,
      course_title: courseMap[r.course_id]?.title ?? "Unknown",
      course_slug: courseMap[r.course_id]?.slug ?? "",
      due_date: r.assignment_id ? assignmentMap[r.assignment_id]?.due_date ?? null : null,
      assignment_notes: r.assignment_id ? assignmentMap[r.assignment_id]?.notes ?? null : null,
    }));
  }

  private async loadCourses(ids: string[]): Promise<Record<string, { title: string; slug: string }>> {
    if (ids.length === 0) return {};
    const { data } = await this.user.from("training_items").select("id, title, slug").in("id", ids);
    const map: Record<string, { title: string; slug: string }> = {};
    for (const item of data ?? []) map[item.id] = { title: item.title, slug: item.slug };
    return map;
  }

  private async loadAssignments(
    ids: string[],
  ): Promise<Record<string, { due_date: string | null; notes: string | null }>> {
    if (ids.length === 0) return {};
    const { data } = await this.user
      .from("training_assignments")
      .select("id, due_date, notes")
      .in("id", ids);
    const map: Record<string, { due_date: string | null; notes: string | null }> = {};
    for (const a of data ?? []) map[a.id] = { due_date: a.due_date, notes: a.notes };
    return map;
  }

  async findExecution(executionId: string): Promise<ExecutionRef | null> {
    const { data, error } = await this.user
      .from("training_executions")
      .select("id, teacher_id, training_item_type, execution_status, assignment_id")
      .eq("id", executionId)
      .maybeSingle();
    if (error) throw Errors.internal(error.message);
    if (!data) return null;
    return {
      id: data.id,
      teacherId: data.teacher_id,
      trainingItemType: data.training_item_type,
      executionStatus: data.execution_status,
      assignmentId: data.assignment_id,
    };
  }

  async findProgressByExecution(executionId: string): Promise<CourseProgressRow | null> {
    const { data, error } = await this.user
      .from("course_progress")
      .select("*")
      .eq("execution_id", executionId)
      .maybeSingle();
    if (error) throw Errors.internal(error.message);
    return (data as CourseProgressRow | null) ?? null;
  }

  async startProgress(cmd: StartCommand): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await this.user
      .from("course_progress")
      .update({
        progress_status: "in_progress",
        started_at: now,
        first_activity_at: now,
        last_activity_at: now,
      })
      .eq("id", cmd.progressId);
    if (error) throw Errors.internal(error.message);

    if (cmd.executionStatus === "assigned") {
      await this.user
        .from("training_executions")
        .update({ execution_status: "active", activated_at: now, last_activity_at: now })
        .eq("id", cmd.executionId);
    } else {
      await this.user
        .from("training_executions")
        .update({ last_activity_at: now })
        .eq("id", cmd.executionId);
    }

    if (cmd.assignmentId) {
      await this.user
        .from("training_assignments")
        .update({ status: "in_progress" })
        .eq("id", cmd.assignmentId);
    }
  }

  async touchProgress(cmd: TouchCommand): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.user
      .from("course_progress")
      .update({ last_activity_at: now })
      .eq("id", cmd.progressId);
    if (error) throw Errors.internal(error.message);

    await this.user
      .from("training_executions")
      .update({ last_activity_at: now })
      .eq("id", cmd.executionId);
  }

  async complete(executionId: string): Promise<CompleteResult> {
    const { data, error } = await this.user.rpc("complete_course_progress", {
      p_execution_id: executionId,
    });
    if (error) throw mapRpcError(error);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw Errors.internal("complete_course_progress returned no row");
    return {
      courseId: row.course_id,
      teacherId: row.teacher_id,
      newlyCompleted: row.newly_completed,
    };
  }

  async refreshPathwaysForCourse(teacherId: string, courseId: string): Promise<void> {
    const { data: execs } = await this.admin
      .from("pathway_executions")
      .select("id, pathway_id, enrollment_id")
      .eq("teacher_id", teacherId)
      .eq("status", "active");
    if (!execs || execs.length === 0) return;

    const pathwayIds = unique(execs.map((e) => e.pathway_id));
    const { data: pathways } = await this.admin
      .from("training_items")
      .select("id, required_course_ids")
      .in("id", pathwayIds);

    const requiredByPathway: Record<string, string[]> = {};
    for (const p of pathways ?? []) requiredByPathway[p.id] = p.required_course_ids ?? [];

    for (const exec of execs) {
      const required = requiredByPathway[exec.pathway_id] ?? [];
      if (!required.includes(courseId)) continue; // this course isn't part of this pathway
      await this.syncOnePathway(exec, required, teacherId);
    }
  }

  private async syncOnePathway(
    exec: { id: string; pathway_id: string; enrollment_id: string | null },
    requiredCourseIds: string[],
    teacherId: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const completedCourseIds = await this.completedRequiredCourseIds(teacherId, requiredCourseIds);

    const { data: milestoneRows } = await this.admin
      .from("pathway_milestone_progress")
      .select("id, status, linked_course_ids, milestone_order")
      .eq("execution_id", exec.id)
      .order("milestone_order", { ascending: true });

    const milestones: MilestoneInput[] = (milestoneRows ?? []).map((m) => ({
      id: m.id,
      status: m.status,
      linkedCourseIds: m.linked_course_ids ?? [],
    }));

    const result = computePathwayProgress({ requiredCourseIds, completedCourseIds, milestones, now });

    for (const update of result.milestoneUpdates) {
      await this.admin
        .from("pathway_milestone_progress")
        .update(
          update.status === "completed"
            ? { status: "completed", completed_at: update.completedAt }
            : { status: update.status },
        )
        .eq("id", update.id);
    }

    const execUpdate: Record<string, unknown> = { progress_percent: result.progressPercent };

    if (result.pathwayComplete) {
      execUpdate.status = "completed";
      execUpdate.completed_at = now;
      execUpdate.progress_percent = 100;

      if (exec.enrollment_id) {
        await this.admin
          .from("training_enrollments")
          .update({ status: "completed", completed_at: now })
          .eq("id", exec.enrollment_id);
        await this.admin
          .from("training_executions")
          .update({ execution_status: "completed", completed_at: now, last_activity_at: now })
          .eq("enrollment_id", exec.enrollment_id)
          .in("execution_status", ["assigned", "active"]);
      }

      const { error } = await this.admin.from("training_completions").insert({
        teacher_id: teacherId,
        source_id: exec.pathway_id,
        source_type: "training_pathway",
        completed_at: now,
        completion_evidence: { type: "pathway_auto_completed", pathway_execution_id: exec.id },
      });
      if (error && error.code !== "23505") {
        this.logger.warn("pathway_completion_insert_failed", { message: error.message });
      }
    }

    await this.admin.from("pathway_executions").update(execUpdate).eq("id", exec.id);
  }

  private async completedRequiredCourseIds(
    teacherId: string,
    requiredCourseIds: string[],
  ): Promise<Set<string>> {
    const completed = new Set<string>();
    if (requiredCourseIds.length === 0) return completed;

    const { data: completions } = await this.admin
      .from("training_completions")
      .select("source_id")
      .eq("teacher_id", teacherId)
      .eq("source_type", "training_item")
      .in("source_id", requiredCourseIds);
    for (const c of completions ?? []) completed.add(c.source_id);

    const { data: progress } = await this.admin
      .from("course_progress")
      .select("course_id, progress_status")
      .eq("teacher_id", teacherId)
      .in("course_id", requiredCourseIds);
    for (const cp of progress ?? []) {
      if (cp.progress_status === "completed") completed.add(cp.course_id);
    }

    return completed;
  }
}

function mapRpcError(error: PostgrestError): DomainError {
  const message = error.message ?? "";
  const strip = (m: string) => m.replace(/^[A-Z_]+:\s*/, "");
  if (message.startsWith("NOT_FOUND")) return Errors.notFound(strip(message));
  if (message.startsWith("FORBIDDEN")) return Errors.forbidden(strip(message));
  if (message.startsWith("ALREADY_COMPLETED")) return Errors.conflict(strip(message));
  if (message.startsWith("INVALID_STATE")) return Errors.invalidState(strip(message));
  return Errors.internal(message);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}
