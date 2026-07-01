/**
 * Application ports — the interfaces the service depends on. Infrastructure
 * (Supabase, logging) implements these; the service never imports Supabase.
 */

import type { ProgressStatus } from "../domain/progress-status.ts";

export interface Identity {
  userId: string;
  teacherId: string;
}

export interface CourseProgressRow {
  id: string;
  execution_id: string;
  assignment_id: string | null;
  school_id: string | null;
  teacher_id: string;
  course_id: string;
  progress_status: ProgressStatus;
  progress_percent: number | null;
  started_at: string | null;
  first_activity_at: string | null;
  last_activity_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseProgressListItem extends CourseProgressRow {
  course_title: string;
  course_slug: string;
  due_date: string | null;
  assignment_notes: string | null;
}

export interface ExecutionRef {
  id: string;
  teacherId: string;
  trainingItemType: string;
  executionStatus: string;
  assignmentId: string | null;
}

export interface StartCommand {
  progressId: string;
  executionId: string;
  assignmentId: string | null;
  executionStatus: string;
}

export interface TouchCommand {
  progressId: string;
  executionId: string;
}

export interface CompleteResult {
  courseId: string;
  teacherId: string;
  newlyCompleted: boolean;
}

export interface CourseProgressRepository {
  listForTeacher(teacherId: string): Promise<CourseProgressListItem[]>;
  findExecution(executionId: string): Promise<ExecutionRef | null>;
  findProgressByExecution(executionId: string): Promise<CourseProgressRow | null>;
  startProgress(cmd: StartCommand): Promise<void>;
  touchProgress(cmd: TouchCommand): Promise<void>;
  /** Atomic (single Postgres transaction via RPC). Re-validates ownership/status server-side. */
  complete(executionId: string): Promise<CompleteResult>;
  /** Derived projection refresh — eventually consistent, safe to fail. */
  refreshPathwaysForCourse(teacherId: string, courseId: string): Promise<void>;
}

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}
