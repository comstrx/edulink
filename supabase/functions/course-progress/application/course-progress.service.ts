/**
 * Application service — the use cases. Orchestrates domain rules + ports.
 * Contains no HTTP, no Supabase, no `any`. This is the layer that would move
 * verbatim into the modular monolith (see delivery/02-TARGET_ARCHITECTURE.md).
 */

import { applyAction } from "../domain/progress-status.ts";
import { Errors } from "../domain/errors.ts";
import type {
  CompleteResult,
  CourseProgressListItem,
  CourseProgressRepository,
  CourseProgressRow,
  ExecutionRef,
  Identity,
  Logger,
} from "./ports.ts";

export class CourseProgressService {
  constructor(
    private readonly repo: CourseProgressRepository,
    private readonly logger: Logger,
  ) {}

  list(identity: Identity): Promise<CourseProgressListItem[]> {
    return this.repo.listForTeacher(identity.teacherId);
  }

  async start(identity: Identity, executionId: string): Promise<void> {
    const { exec, cp } = await this.loadOwnedCourse(identity, executionId);
    applyAction("start", cp.progress_status); // throws typed error if illegal
    await this.repo.startProgress({
      progressId: cp.id,
      executionId,
      assignmentId: exec.assignmentId,
      executionStatus: exec.executionStatus,
    });
    this.logger.info("course_started", { executionId, teacherId: identity.teacherId });
  }

  async resume(identity: Identity, executionId: string): Promise<void> {
    const { cp } = await this.loadOwnedCourse(identity, executionId);
    applyAction("continue", cp.progress_status);
    await this.repo.touchProgress({ progressId: cp.id, executionId });
  }

  async complete(identity: Identity, executionId: string): Promise<CompleteResult> {
    // Authority + atomicity live in the RPC: it re-checks ownership/type/status
    // and performs every write in one transaction (audit #2, #3).
    const result = await this.repo.complete(executionId);
    this.logger.info("course_completed", {
      executionId,
      courseId: result.courseId,
      teacherId: result.teacherId,
      newlyCompleted: result.newlyCompleted,
    });

    // Pathway progress is a derived, eventually-consistent projection. It must
    // never fail an already-committed completion — best effort, logged (not
    // swallowed). Target architecture: a queued worker instead of inline.
    try {
      await this.repo.refreshPathwaysForCourse(result.teacherId, result.courseId);
    } catch (err) {
      this.logger.warn("pathway_refresh_failed", {
        executionId,
        courseId: result.courseId,
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return result;
  }

  private async loadOwnedCourse(
    identity: Identity,
    executionId: string,
  ): Promise<{ exec: ExecutionRef; cp: CourseProgressRow }> {
    const exec = await this.repo.findExecution(executionId);
    if (!exec) throw Errors.notFound("Execution not found");
    if (exec.teacherId !== identity.teacherId) throw Errors.forbidden("Not your execution");
    if (exec.trainingItemType !== "course") {
      throw Errors.invalidRequest("Only course executions support course progress");
    }
    if (exec.executionStatus === "cancelled") {
      throw Errors.invalidState("Cannot progress a cancelled execution");
    }

    const cp = await this.repo.findProgressByExecution(executionId);
    if (!cp) throw Errors.notFound("Course progress not found");
    return { exec, cp };
  }
}
