/**
 * event-names.ts — Central Event Names Registry
 *
 * Single source of truth for all domain event names.
 * Always reference from here — no magic strings.
 *
 * Organized into:
 *   - Domain events (produced by domain mutations)
 *   - Intent events (produced by Smart Glue rules)
 */

export const EVENT_NAMES = {
  /* ── Identity ─────────────────────────────────────── */
  identity: {
    /** Teacher/school profile updated → Intelligence (CRI refresh) */
    profileUpdated: "identity.profile_updated",
  },

  /* ── Hiring ───────────────────────────────────────── */
  hiring: {
    /** Teacher applies to a job (new application INSERT only) */
    jobApplied: "hiring.job_applied",
    /** Application status transitions (withdrawn, rejected, shortlisted, re-applied, etc.) */
    applicationStatusChanged: "hiring.application.status_changed",
    /** Precise rejection event — carries taxonomy-backed reason (Phase 3.3e) */
    applicationRejected: "hiring.application_rejected",
    /** Application accepted (offer extended) → Intelligence (CRI, recommendations) — Sprint 1 */
    applicationAccepted: "hiring.application_accepted",
    /** Interview scheduled → Intelligence (CRI boost, match refresh) — Sprint 1 */
    interviewScheduled: "hiring.interview_scheduled",
    /** Job goes live → Intelligence (match refresh for all relevant teachers) */
    jobPublished: "hiring.job_published",
  },

  /* ── Training ─────────────────────────────────────── */
  training: {
    /** Teacher enrolls in a course/pathway → Intelligence (recommendations) */
    enrolled: "training.enrolled",
    /** Execution starts (learning begins) → Intelligence (activity) */
    executionStarted: "training.execution.started",
    /** Teacher completes a course/pathway → Trust, Intelligence, Hiring */
    completed: "training.completed",
    /** Execution completes → Trust (credentials), Intelligence (CRI) */
    executionCompleted: "training.execution.completed",
    /** Course progress updated (start/continue/complete) → Pathway runtime */
    courseProgressUpdated: "training.course.progress_updated",
    /** Course completed → Pathway cascade, Trust, Intelligence */
    courseCompleted: "training.course.completed",
    /** Pathway execution starts → Intelligence (pathway tracking) */
    pathwayExecutionStarted: "training.pathway.execution_started",
    /** Pathway milestone completed → Intelligence (progress), Training (unlock next) */
    pathwayMilestoneCompleted: "training.pathway.milestone_completed",
    /** Pathway progress recalculated → Intelligence (CRI), Dashboard */
    pathwayProgressUpdated: "training.pathway.progress_updated",
    /** Pathway fully completed → Trust (credential), Intelligence (CRI) */
    pathwayCompleted: "training.pathway.completed",
    /** Evidence submitted → Mentor queue, Intelligence */
    evidenceSubmitted: "training.evidence.submitted",
    /** Evidence review status changed → Notifications, Progress */
    evidenceReviewUpdated: "training.evidence.review_updated",
    /** Evidence deleted → Cleanup */
    evidenceDeleted: "training.evidence.deleted",
    /** Pathway reflection submitted → Mentor review */
    reflectionSubmitted: "training.reflection.submitted",
    /** Mentor review created → Notifications, Progress */
    mentorReviewCreated: "training.mentor.review.created",
    /** Mentor approved evidence → Progress (milestone), CRI, Credentials */
    mentorReviewApproved: "training.mentor.review.approved",
    /** Mentor rejected evidence → Notifications */
    mentorReviewRejected: "training.mentor.review.rejected",
    /** Mentor requested revision → Notifications */
    mentorRevisionRequested: "training.mentor.review.revision_requested",
    /** All evidence verified → Credential eligibility, CRI */
    verifiedCompletion: "training.verified_completion",
  },

  /* ── Trust ────────────────────────────────────────── */
  trust: {
    /** Credential issued to a teacher → Hiring (profile enrichment) */
    credentialIssued: "trust.credential_issued",
    /** Verification process finishes → Hiring, Identity */
    verificationCompleted: "trust.verification_completed",
  },

  /* ── Intelligence (domain events) ─────────────────── */
  intelligence: {
    /** Skill gap identified → Training (recommendations) */
    skillGapDetected: "intelligence.skill_gap_detected",
    /** Match score recalculated → Hiring (ranking) */
    matchScoreUpdated: "intelligence.match_score_updated",
    /** Talent intelligence profile updated → Hiring, UI refresh */
    talentProfileUpdated: "intelligence.talent_profile.updated",
    /** Growth recommendation created → Teacher UI, career panel */
    growthRecommendationCreated: "intelligence.growth_recommendation.created",
    /** Growth recommendation updated → Teacher UI refresh */
    growthRecommendationUpdated: "intelligence.growth_recommendation.updated",
    /** Growth recommendation completed → Talent profile refresh */
    growthRecommendationCompleted: "intelligence.growth_recommendation.completed",
    /** Growth recommendation staled → Cleanup */
    growthRecommendationStaled: "intelligence.growth_recommendation.staled",
    /** Teacher career stage updated → UI refresh, hiring signals */
    careerStageUpdated: "career.teacher_stage.updated",
    /** Reputation profile updated → UI refresh, hiring signals */
    reputationProfileUpdated: "intelligence.reputation_profile.updated",
    /** Mobility state updated → UI refresh, hiring signals */
    mobilityStateUpdated: "mobility.teacher_state.updated",
  },

  /* ── Intents (produced by Smart Glue rules) ───────── */
  intents: {
    /** Request CRI recomputation for a teacher */
    criRefreshRequested: "intent.cri_refresh_requested",
    /** Request match-score recomputation for a teacher×job pair */
    matchRefreshRequested: "intent.match_refresh_requested",
    /** Request skill-gap analysis for a teacher */
    skillGapRefreshRequested: "intent.skill_gap_refresh_requested",
    /** Request training recommendations for a teacher */
    trainingRecommendationRequested: "intent.training_recommendation_requested",
    /** Request verified-state refresh for a teacher profile */
    verifiedStateRefreshRequested: "intent.verified_state_refresh_requested",
    /** Request talent intelligence profile refresh */
    talentProfileRefreshRequested: "intent.talent_profile_refresh_requested",
    /** Request growth recommendation refresh from hiring outcomes */
    growthRecommendationRefreshRequested: "intent.growth_recommendation_refresh_requested",
    /** Request career state refresh — Sprint 8A */
    careerStateRefreshRequested: "intent.career_state_refresh_requested",
    /** Request reputation profile refresh — Sprint 8B (generic, backward compat) */
    reputationRefreshRequested: "intent.reputation_refresh_requested",
    /** Request teacher trust refresh — explicit teacher signal */
    teacherTrustRefreshRequested: "intent.teacher_trust_refresh_requested",
    /** Request mentor reputation refresh — explicit mentor signal */
    mentorReputationRefreshRequested: "intent.mentor_reputation_refresh_requested",
    /** Request mobility state refresh — Sprint 8C */
    mobilityRefreshRequested: "intent.mobility_refresh_requested",
    /** Request workforce intelligence refresh — Sprint 8D */
    workforceRefreshRequested: "intent.workforce_refresh_requested",
  },

  /* ── Workforce (Sprint 8D) ───────────────────────── */
  workforce: {
    /** School workforce profile updated */
    schoolProfileUpdated: "workforce.school_profile.updated",
  },

  /* ── Admin (Sprint 13) ────────────────────────────── */
  admin: {
    /** Admin approves a mentor session review → Mentor reputation, trust */
    reviewApproved: "admin.review_approved",
    /** Admin rejects a mentor session review → Mentor reputation */
    reviewRejected: "admin.review_rejected",
    /** Admin approves provider content → Provider trust, content visibility */
    contentApproved: "admin.content_approved",
    /** Admin rejects provider content → Provider feedback */
    contentRejected: "admin.content_rejected",
  },

  /* ── Mentorship ───────────────────────────────────── */
  mentorship: {
    /** Mentor session completed → Intelligence (CRI, talent, growth) */
    sessionCompleted: "mentorship.session.completed",
    /** Mentorship evidence submitted → Mentor review queue */
    evidenceSubmitted: "mentorship.evidence.submitted",
    /** Mentorship evidence approved → CRI, Talent, Recommendations (validated growth signal) */
    evidenceApproved: "mentorship.evidence.approved",
    /** Mentorship evidence rejected → Teacher feedback */
    evidenceRejected: "mentorship.evidence.rejected",
  },

  /* ── Commerce (Sprint B3-A) ──────────────────────── */
  commerce: {
    /** New order created */
    orderCreated: "commerce.order_created",
    /** Payment intent initiated */
    paymentInitiated: "commerce.payment_initiated",
    /** Payment completed successfully */
    paymentCompleted: "commerce.payment_completed",
    /** Payment failed */
    paymentFailed: "commerce.payment_failed",
    /** Revenue distributed to ledger */
    revenueRecorded: "commerce.revenue_recorded",
    /** Mentor earnings created */
    mentorEarningsCreated: "commerce.mentor.earnings_created",
    /** Provider earnings created */
    providerEarningsCreated: "commerce.provider.earnings_created",
    /** Payout initiated */
    payoutInitiated: "commerce.payout_initiated",
    /** Payout completed */
    payoutCompleted: "commerce.payout_completed",
    /** Price resolved for item */
    priceResolved: "billing.price_resolved",
    /** Contact sales requested */
    contactSalesRequested: "billing.contact_sales_requested",
    /** Quote requested */
    quoteRequested: "billing.quote_requested",
  },
} as const;

/** Union of all event name string literals */
export type EventName =
  | (typeof EVENT_NAMES.identity)[keyof typeof EVENT_NAMES.identity]
  | (typeof EVENT_NAMES.hiring)[keyof typeof EVENT_NAMES.hiring]
  | (typeof EVENT_NAMES.training)[keyof typeof EVENT_NAMES.training]
  | (typeof EVENT_NAMES.trust)[keyof typeof EVENT_NAMES.trust]
  | (typeof EVENT_NAMES.intelligence)[keyof typeof EVENT_NAMES.intelligence]
  | (typeof EVENT_NAMES.intents)[keyof typeof EVENT_NAMES.intents]
  | (typeof EVENT_NAMES.workforce)[keyof typeof EVENT_NAMES.workforce]
  | (typeof EVENT_NAMES.mentorship)[keyof typeof EVENT_NAMES.mentorship]
  | (typeof EVENT_NAMES.admin)[keyof typeof EVENT_NAMES.admin]

  | (typeof EVENT_NAMES.commerce)[keyof typeof EVENT_NAMES.commerce];
