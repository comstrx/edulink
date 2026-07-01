import type { DomainEvent } from "../core/domain-event";

/**
 * Training Progress Domain Contracts — Sprint 6C
 *
 * Defines the unified progress lifecycle model used across all
 * training objects: courses, pathways, milestones, and future
 * evidence/mentor validation layers.
 *
 * Phase 6 — Professional Growth Engine
 */

// ── Canonical Progress Lifecycle ──

/**
 * Unified progress states used across the Training domain.
 *
 * Not all objects use every state:
 *   Course:     not_started → in_progress → completed → verified
 *   Pathway:    not_started → in_progress → completed → verified
 *   Milestone:  locked → available → completed
 *   Evidence:   submitted → under_review → verified  (future Sprint 6D)
 *   Mentor:     submitted → under_review → verified  (future Sprint 6E)
 */
export type UnifiedProgressStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "completed"
  | "verified";

/** Course-specific progress states (subset of unified model) */
export type CourseProgressStatus = "not_started" | "in_progress" | "completed";

/** Milestone-specific progress states */
export type MilestoneProgressStatus = "locked" | "available" | "completed";

/** Pathway execution states (aligned with enrollment lifecycle) */
export type PathwayProgressStatus = "enrolled" | "active" | "completed" | "cancelled" | "dropped";

/** Verification tier — distinguishes self-reported from externally validated */
export type VerificationTier = "self_reported" | "system_verified" | "mentor_verified" | "externally_verified";

// ── Progress Computation Model ──

/**
 * Describes how pathway progress is computed server-side.
 *
 * Formula:
 *   progress = (courseWeight × courseCompletion) + (milestoneWeight × milestoneCompletion)
 *
 * Default weights: courses 60%, milestones 40%
 * If no milestones exist: 100% courses
 * If no required courses: 100% milestones
 */
export interface PathwayProgressFormula {
  courseWeight: number;
  milestoneWeight: number;
  completedCourses: number;
  totalCourses: number;
  completedMilestones: number;
  totalMilestones: number;
  computedPercent: number;
}

// ── Domain Events ──

/**
 * Emitted when course progress changes (start, continue, complete).
 *
 * Produced by: Progress Engine (course-progress edge function)
 * Consumers: Pathway runtime (auto-sync), Intelligence (activity)
 */
export interface CourseProgressUpdatedPayload {
  teacherId: string;
  courseId: string;
  executionId: string;
  previousStatus: CourseProgressStatus;
  newStatus: CourseProgressStatus;
  progressPercent: number;
  updatedAt: string;
}

export type CourseProgressUpdatedEvent = DomainEvent<CourseProgressUpdatedPayload>;

/**
 * Emitted when a course is completed.
 *
 * Produced by: Progress Engine
 * Consumers: Pathway runtime (cascade), Trust (credentials), Intelligence (CRI)
 */
export interface CourseCompletedPayload {
  teacherId: string;
  courseId: string;
  executionId: string;
  enrollmentId?: string | null;
  completedAt: string;
}

export type CourseCompletedEvent = DomainEvent<CourseCompletedPayload>;

/**
 * Emitted when pathway progress is recalculated.
 *
 * Produced by: Pathway runtime (progress refresh)
 * Consumers: Intelligence (CRI), Dashboard (display)
 */
export interface PathwayProgressUpdatedPayload {
  teacherId: string;
  pathwayId: string;
  pathwayExecutionId: string;
  previousPercent: number;
  newPercent: number;
  completedCourses: number;
  totalCourses: number;
  completedMilestones: number;
  totalMilestones: number;
  updatedAt: string;
}

export type PathwayProgressUpdatedEvent = DomainEvent<PathwayProgressUpdatedPayload>;

// ── Progress Computation Constants ──

export const PROGRESS_WEIGHTS = {
  /** Weight of required course completion in pathway progress (0-1) */
  COURSE_WEIGHT: 0.6,
  /** Weight of milestone completion in pathway progress (0-1) */
  MILESTONE_WEIGHT: 0.4,
} as const;

/**
 * Compute pathway progress percent using the standard formula.
 * Pure function — no side effects.
 */
export function computePathwayProgress(
  completedCourses: number,
  totalCourses: number,
  completedMilestones: number,
  totalMilestones: number,
): number {
  if (totalCourses === 0 && totalMilestones === 0) return 0;

  if (totalCourses > 0 && totalMilestones > 0) {
    const courseProgress = (completedCourses / totalCourses) * 100;
    const milestoneProgress = (completedMilestones / totalMilestones) * 100;
    return Math.round(
      courseProgress * PROGRESS_WEIGHTS.COURSE_WEIGHT +
      milestoneProgress * PROGRESS_WEIGHTS.MILESTONE_WEIGHT,
    );
  }

  if (totalCourses > 0) {
    return Math.round((completedCourses / totalCourses) * 100);
  }

  return Math.round((completedMilestones / totalMilestones) * 100);
}
