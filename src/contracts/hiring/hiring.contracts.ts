import type { DomainEvent } from "../core/domain-event";

/**
 * Hiring Domain Contracts
 *
 * Covers job application and rejection lifecycle events.
 *
 * Phase 1 — Smart Domain Contracts Foundation
 */

/**
 * Emitted when a teacher applies to a job.
 *
 * Produced by: Hiring domain (useApplyToJob onSuccess)
 *
 * Minimal required identifiers: teacherId, jobId.
 * Optional enrichments resolvable by consumers:
 *   - schoolId → via jobs.school_id
 *   - appliedAt → via applications.created_at (prefer DB timestamp over client clock)
 *   - applicationId → requires insert to return created row
 */
export interface JobAppliedPayload {
  teacherId: string;
  jobId: string;
  applicationId?: string | null;
  schoolId?: string | null;
  appliedAt?: string | null;
}

export type JobAppliedEvent = DomainEvent<JobAppliedPayload>;

/**
 * Emitted when an existing application status transitions.
 *
 * Covers: withdrawn, rejected, shortlisted, re-applied, etc.
 * Re-apply via status update emits this event, NOT job_applied.
 *
 * Produced by: Hiring domain (useUpdateApplicationStatus onSuccess)
 *
 * Minimal required identifiers: applicationId, newStatus.
 * Optional enrichments resolvable by consumers:
 *   - teacherId → via applications.teacher_id
 *   - jobId → via applications.job_id
 *   - previousStatus → requires pre-read or caller context
 */
export interface ApplicationStatusChangedPayload {
  applicationId: string;
  newStatus: string;
  teacherId?: string | null;
  jobId?: string | null;
  previousStatus?: string | null;
  /** Taxonomy term ID for rejection reason — required when newStatus === "rejected" (wired in 3.3b) */
  rejectionReasonTermId?: string | null;
}

export type ApplicationStatusChangedEvent = DomainEvent<ApplicationStatusChangedPayload>;

/**
 * Emitted precisely when an application is rejected.
 * NOT a generic status change — this is a semantically distinct domain action.
 *
 * Produced by: Hiring domain (useUpdateApplicationStatus onSuccess, only when newStatus === "rejected")
 * Consumed by: Smart Glue → skill gap refresh → recommendation generation
 *
 * Phase 3.3e
 */
export interface ApplicationRejectedPayload {
  applicationId: string;
  teacherId: string;
  jobId: string;
  /** Taxonomy term ID from rejection_reasons domain */
  rejectionReasonTermId: string;
  rejectedAt: string;
}

export type ApplicationRejectedEvent = DomainEvent<ApplicationRejectedPayload>;

/**
 * Emitted when an application is accepted (offer extended).
 * Sprint 1 — MVP Activation
 */
export interface ApplicationAcceptedPayload {
  applicationId: string;
  teacherId: string;
  jobId: string;
  acceptedAt: string;
}

/**
 * Emitted when an interview is scheduled.
 * Sprint 1 — MVP Activation
 */
export interface InterviewScheduledPayload {
  applicationId: string;
  teacherId: string;
  jobId: string;
  interviewId?: string;
  scheduledAt: string;
}

export interface JobPublishedPayload {
  jobId: string;
  schoolId: string;
  title: string;
  subjectTermIds?: string[];
  countryTermId?: string;
}

export interface JobClosedPayload {
  jobId: string;
  schoolId: string;
  reason?: string;
}

export interface CandidateShortlistedPayload {
  teacherId: string;
  schoolUserId: string;
  jobId?: string;
}

export interface CandidateSavedPayload {
  teacherProfileId: string;
  schoolUserId: string;
}
