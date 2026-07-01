/**
 * event-map.ts — Event Name → Payload Type Map
 *
 * Enable strong typing for event handlers and emitters.
 */

import { EVENT_NAMES } from "./event-names";

import type { ProfileUpdatedPayload } from "../identity/identity.contracts";
import type {
  AdminReviewApprovedPayload,
  AdminReviewRejectedPayload,
  AdminContentApprovedPayload,
  AdminContentRejectedPayload,
} from "../admin/admin.contracts";
import type { TrainingCompletedPayload } from "../training/training.contracts";
import type {
  TrainingEnrolledPayload,
  ExecutionStartedPayload,
  ExecutionCompletedPayload,
  PathwayExecutionStartedPayload,
  PathwayMilestoneCompletedPayload,
  PathwayCompletedPayload,
} from "../training/enrollment.contracts";
import type {
  CourseProgressUpdatedPayload,
  CourseCompletedPayload,
  PathwayProgressUpdatedPayload,
} from "../training/progress.contracts";
import type {
  EvidenceSubmittedPayload,
  EvidenceReviewUpdatedPayload,
  EvidenceDeletedPayload,
  ReflectionSubmittedPayload,
} from "../training/evidence.contracts";
import type {
  MentorReviewCreatedPayload,
  MentorReviewApprovedPayload,
  MentorReviewRejectedPayload,
  MentorRevisionRequestedPayload,
  VerifiedCompletionPayload,
} from "../training/mentor.contracts";
import type {
  JobAppliedPayload,
  ApplicationStatusChangedPayload,
  ApplicationRejectedPayload,
  ApplicationAcceptedPayload,
  InterviewScheduledPayload,
  JobPublishedPayload,
} from "../hiring/hiring.contracts";
import type { CredentialIssuedPayload, VerificationCompletedPayload } from "../trust/trust.contracts";
import type { SkillGapDetectedPayload, MatchScoreUpdatedPayload, TalentProfileUpdatedPayload } from "../intelligence/intelligence.contracts";
import type { GrowthRecommendationEventPayload } from "../intelligence/intelligence.contracts";
import type { MentorSessionCompletedPayload } from "../training/mentor-session.contracts";
import type {
  MentorshipEvidenceSubmittedPayload,
  MentorshipEvidenceApprovedPayload,
  MentorshipEvidenceRejectedPayload,
} from "../training/mentorship-evidence.contracts";
import type {
  OrderCreatedPayload,
  PaymentInitiatedPayload,
  PaymentCompletedPayload,
  PaymentFailedPayload,
} from "../commerce/commerce.contracts";
import type {
  RevenueRecordedPayload,
  EarningsCreatedPayload,
  PayoutInitiatedPayload,
  PayoutCompletedPayload,
} from "../commerce/revenue.contracts";
import type {
  PriceResolvedPayload,
  ContactSalesRequestedPayload,
  QuoteRequestedPayload,
} from "../commerce/billing.contracts";
import type {
  CriRefreshRequestedPayload,
  MatchRefreshRequestedPayload,
  SkillGapRefreshRequestedPayload,
  TrainingRecommendationRequestedPayload,
  VerifiedStateRefreshRequestedPayload,
  TalentProfileRefreshRequestedPayload,
  GrowthRecommendationRefreshRequestedPayload,
  CareerStateRefreshRequestedPayload,
  ReputationRefreshRequestedPayload,
  TeacherTrustRefreshRequestedPayload,
  MentorReputationRefreshRequestedPayload,
  MobilityRefreshRequestedPayload,
  WorkforceRefreshRequestedPayload,
} from "../smart-glue/intent.contracts";

export interface EventPayloadMap {
  /* ── Identity ── */
  [EVENT_NAMES.identity.profileUpdated]: ProfileUpdatedPayload;

  /* ── Hiring ── */
  [EVENT_NAMES.hiring.jobApplied]: JobAppliedPayload;
  [EVENT_NAMES.hiring.applicationStatusChanged]: ApplicationStatusChangedPayload;
  [EVENT_NAMES.hiring.applicationRejected]: ApplicationRejectedPayload;
  [EVENT_NAMES.hiring.applicationAccepted]: ApplicationAcceptedPayload;
  [EVENT_NAMES.hiring.interviewScheduled]: InterviewScheduledPayload;
  [EVENT_NAMES.hiring.jobPublished]: JobPublishedPayload;

  /* ── Training ── */
  [EVENT_NAMES.training.enrolled]: TrainingEnrolledPayload;
  [EVENT_NAMES.training.executionStarted]: ExecutionStartedPayload;
  [EVENT_NAMES.training.completed]: TrainingCompletedPayload;
  [EVENT_NAMES.training.executionCompleted]: ExecutionCompletedPayload;
  [EVENT_NAMES.training.courseProgressUpdated]: CourseProgressUpdatedPayload;
  [EVENT_NAMES.training.courseCompleted]: CourseCompletedPayload;
  [EVENT_NAMES.training.pathwayExecutionStarted]: PathwayExecutionStartedPayload;
  [EVENT_NAMES.training.pathwayMilestoneCompleted]: PathwayMilestoneCompletedPayload;
  [EVENT_NAMES.training.pathwayProgressUpdated]: PathwayProgressUpdatedPayload;
  [EVENT_NAMES.training.pathwayCompleted]: PathwayCompletedPayload;
  [EVENT_NAMES.training.evidenceSubmitted]: EvidenceSubmittedPayload;
  [EVENT_NAMES.training.evidenceReviewUpdated]: EvidenceReviewUpdatedPayload;
  [EVENT_NAMES.training.evidenceDeleted]: EvidenceDeletedPayload;
  [EVENT_NAMES.training.reflectionSubmitted]: ReflectionSubmittedPayload;
  [EVENT_NAMES.training.mentorReviewCreated]: MentorReviewCreatedPayload;
  [EVENT_NAMES.training.mentorReviewApproved]: MentorReviewApprovedPayload;
  [EVENT_NAMES.training.mentorReviewRejected]: MentorReviewRejectedPayload;
  [EVENT_NAMES.training.mentorRevisionRequested]: MentorRevisionRequestedPayload;
  [EVENT_NAMES.training.verifiedCompletion]: VerifiedCompletionPayload;

  /* ── Trust ── */
  [EVENT_NAMES.trust.credentialIssued]: CredentialIssuedPayload;
  [EVENT_NAMES.trust.verificationCompleted]: VerificationCompletedPayload;

  /* ── Intelligence ── */
  [EVENT_NAMES.intelligence.skillGapDetected]: SkillGapDetectedPayload;
  [EVENT_NAMES.intelligence.matchScoreUpdated]: MatchScoreUpdatedPayload;
  [EVENT_NAMES.intelligence.talentProfileUpdated]: TalentProfileUpdatedPayload;
  [EVENT_NAMES.intelligence.growthRecommendationCreated]: GrowthRecommendationEventPayload;
  [EVENT_NAMES.intelligence.growthRecommendationUpdated]: GrowthRecommendationEventPayload;
  [EVENT_NAMES.intelligence.growthRecommendationCompleted]: GrowthRecommendationEventPayload;
  [EVENT_NAMES.intelligence.growthRecommendationStaled]: GrowthRecommendationEventPayload;
  [EVENT_NAMES.intelligence.careerStageUpdated]: { teacherId: string; updatedAt: string };
  [EVENT_NAMES.intelligence.reputationProfileUpdated]: { teacherId: string; updatedAt: string };
  [EVENT_NAMES.intelligence.mobilityStateUpdated]: { teacherId: string; updatedAt: string };

  /* ── Intents (Smart Glue) ── */
  [EVENT_NAMES.intents.criRefreshRequested]: CriRefreshRequestedPayload;
  [EVENT_NAMES.intents.matchRefreshRequested]: MatchRefreshRequestedPayload;
  [EVENT_NAMES.intents.skillGapRefreshRequested]: SkillGapRefreshRequestedPayload;
  [EVENT_NAMES.intents.trainingRecommendationRequested]: TrainingRecommendationRequestedPayload;
  [EVENT_NAMES.intents.verifiedStateRefreshRequested]: VerifiedStateRefreshRequestedPayload;
  [EVENT_NAMES.intents.talentProfileRefreshRequested]: TalentProfileRefreshRequestedPayload;
  [EVENT_NAMES.intents.growthRecommendationRefreshRequested]: GrowthRecommendationRefreshRequestedPayload;
  [EVENT_NAMES.intents.careerStateRefreshRequested]: CareerStateRefreshRequestedPayload;
  [EVENT_NAMES.intents.reputationRefreshRequested]: ReputationRefreshRequestedPayload;
  [EVENT_NAMES.intents.teacherTrustRefreshRequested]: TeacherTrustRefreshRequestedPayload;
  [EVENT_NAMES.intents.mentorReputationRefreshRequested]: MentorReputationRefreshRequestedPayload;
  [EVENT_NAMES.intents.mobilityRefreshRequested]: MobilityRefreshRequestedPayload;
  [EVENT_NAMES.intents.workforceRefreshRequested]: WorkforceRefreshRequestedPayload;

  /* ── Mentorship ── */
  [EVENT_NAMES.mentorship.sessionCompleted]: MentorSessionCompletedPayload;
  [EVENT_NAMES.mentorship.evidenceSubmitted]: MentorshipEvidenceSubmittedPayload;
  [EVENT_NAMES.mentorship.evidenceApproved]: MentorshipEvidenceApprovedPayload;
  [EVENT_NAMES.mentorship.evidenceRejected]: MentorshipEvidenceRejectedPayload;

  /* ── Admin (Sprint 13) ── */
  [EVENT_NAMES.admin.reviewApproved]: AdminReviewApprovedPayload;
  [EVENT_NAMES.admin.reviewRejected]: AdminReviewRejectedPayload;
  [EVENT_NAMES.admin.contentApproved]: AdminContentApprovedPayload;
  [EVENT_NAMES.admin.contentRejected]: AdminContentRejectedPayload;

  /* ── Workforce (Sprint 8D) ── */
  [EVENT_NAMES.workforce.schoolProfileUpdated]: { schoolId: string; updatedAt: string };

  /* ── Commerce (Sprint B3-A/B) ── */
  [EVENT_NAMES.commerce.orderCreated]: OrderCreatedPayload;
  [EVENT_NAMES.commerce.paymentInitiated]: PaymentInitiatedPayload;
  [EVENT_NAMES.commerce.paymentCompleted]: PaymentCompletedPayload;
  [EVENT_NAMES.commerce.paymentFailed]: PaymentFailedPayload;
  [EVENT_NAMES.commerce.revenueRecorded]: RevenueRecordedPayload;
  [EVENT_NAMES.commerce.mentorEarningsCreated]: EarningsCreatedPayload;
  [EVENT_NAMES.commerce.providerEarningsCreated]: EarningsCreatedPayload;
  [EVENT_NAMES.commerce.payoutInitiated]: PayoutInitiatedPayload;
  [EVENT_NAMES.commerce.payoutCompleted]: PayoutCompletedPayload;
  [EVENT_NAMES.commerce.priceResolved]: PriceResolvedPayload;
  [EVENT_NAMES.commerce.contactSalesRequested]: ContactSalesRequestedPayload;
  [EVENT_NAMES.commerce.quoteRequested]: QuoteRequestedPayload;
}

/** @deprecated Use EventPayloadMap instead */
export type DomainEventMap = EventPayloadMap;
