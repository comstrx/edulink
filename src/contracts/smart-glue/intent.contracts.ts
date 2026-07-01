/**
 * Smart Glue Intent Contracts
 *
 * Intents are "please do X" signals emitted by Smart Glue rules.
 * They carry only the minimal context needed by the executor.
 *
 * Hardened: Separated reputation refresh into explicit entity-specific intents:
 *   - teacherTrustRefreshRequested   (teacher trust signal)
 *   - mentorReputationRefreshRequested (mentor reputation signal)
 *   - reputationRefreshRequested kept for backward compat (generic teacher-based)
 */

/** Request CRI recomputation for a teacher */
export interface CriRefreshRequestedPayload {
  teacherId: string;
  /** The event that triggered this intent */
  triggeredBy: string;
  jobId?: string | null;
}

/** Request match-score recomputation */
export interface MatchRefreshRequestedPayload {
  teacherId?: string | null;
  jobId?: string | null;
  /** The event that triggered this intent */
  triggeredBy: string;
}

/** Request skill-gap analysis */
export interface SkillGapRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
  jobId?: string | null;
  /** Status that triggered this (e.g. "rejected") */
  triggerStatus?: string | null;
}

/** Request training recommendations */
export interface TrainingRecommendationRequestedPayload {
  teacherId: string;
  triggeredBy: string;
  skillIds?: string[];
}

/** Request verified-state refresh */
export interface VerifiedStateRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
}

/** Request talent intelligence profile refresh */
export interface TalentProfileRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
}

/** Request growth recommendation refresh from hiring outcomes */
export interface GrowthRecommendationRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
  rejectionReasonTermId?: string;
  jobId?: string;
}

/** Request career state refresh — Sprint 8A */
export interface CareerStateRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
}

/** Request reputation profile refresh — Sprint 8B (generic teacher-based, backward compat) */
export interface ReputationRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
  eventType: string;
}

/** Request teacher trust refresh — explicit teacher trust signal */
export interface TeacherTrustRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
}

/** Request mentor reputation refresh — explicit mentor signal */
export interface MentorReputationRefreshRequestedPayload {
  mentorId: string;
  triggeredBy: string;
}

/** Request mobility state refresh — Sprint 8C */
export interface MobilityRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
}

/** Request workforce intelligence refresh — Sprint 8D */
export interface WorkforceRefreshRequestedPayload {
  teacherId: string;
  triggeredBy: string;
}
