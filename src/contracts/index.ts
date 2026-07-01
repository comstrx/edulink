/**
 * contracts/index.ts — Centralized Contracts Export
 *
 * Single entry point for all domain contracts.
 *
 * Usage:
 *   import { EVENT_NAMES, createDomainEvent } from "@/contracts";
 *   import type { EventPayloadMap, JobAppliedPayload } from "@/contracts";
 *
 * Phase 1 — Smart Domain Contracts Foundation
 * Phase 3 — Smart Glue intents added
 */

// ── Core ────────────────────────────────────────────────────────
export type { DomainEvent, DomainName } from "./core/domain-event";
export { createDomainEvent } from "./core/domain-event";
export type { EventName } from "./core/event-names";
export { EVENT_NAMES } from "./core/event-names";
export type { EventPayloadMap } from "./core/event-map";

// ── Identity ────────────────────────────────────────────────────
export type {
  ProfileCompletedPayload,
  ProfileUpdatedPayload,
  RoleAssignedPayload,
  OnboardingFinishedPayload,
} from "./identity/identity.contracts";

// ── Hiring ──────────────────────────────────────────────────────
export type {
  JobAppliedPayload,
  JobAppliedEvent,
  ApplicationStatusChangedPayload,
  ApplicationStatusChangedEvent,
  JobPublishedPayload,
} from "./hiring/hiring.contracts";

// ── Training ────────────────────────────────────────────────────
export type {
  TrainingCompletedPayload,
  TrainingCompletedEvent,
} from "./training/training.contracts";

export type {
  TrainingEnrolledPayload,
  TrainingEnrolledEvent,
  ExecutionStartedPayload,
  ExecutionStartedEvent,
  ExecutionCompletedPayload,
  ExecutionCompletedEvent,
  PathwayExecutionStartedPayload,
  PathwayExecutionStartedEvent,
  PathwayMilestoneCompletedPayload,
  PathwayMilestoneCompletedEvent,
  PathwayCompletedPayload,
  PathwayCompletedEvent,
  EnrollmentStatus,
  EnrollmentSource,
  EnrollableType,
} from "./training/enrollment.contracts";

export { ENROLLABLE_TYPES } from "./training/enrollment.contracts";

export type {
  UnifiedProgressStatus,
  CourseProgressStatus,
  MilestoneProgressStatus,
  PathwayProgressStatus,
  VerificationTier,
  PathwayProgressFormula,
  CourseProgressUpdatedPayload,
  CourseProgressUpdatedEvent,
  CourseCompletedPayload,
  CourseCompletedEvent,
  PathwayProgressUpdatedPayload,
  PathwayProgressUpdatedEvent,
} from "./training/progress.contracts";

export {
  PROGRESS_WEIGHTS,
  computePathwayProgress,
} from "./training/progress.contracts";

export type {
  EvidenceType,
  EvidenceReviewStatus,
  EvidenceSubmittedPayload,
  EvidenceSubmittedEvent,
  EvidenceReviewUpdatedPayload,
  EvidenceReviewUpdatedEvent,
  EvidenceDeletedPayload,
  EvidenceDeletedEvent,
  ReflectionSubmittedPayload,
  ReflectionSubmittedEvent,
} from "./training/evidence.contracts";

// ── Training: Mentor Validation ─────────────────────────────────
export type {
  MentorStatus,
  MentorReviewDecision,
  MentorReviewCreatedPayload,
  MentorReviewCreatedEvent,
  MentorReviewApprovedPayload,
  MentorReviewApprovedEvent,
  MentorReviewRejectedPayload,
  MentorReviewRejectedEvent,
  MentorRevisionRequestedPayload,
  MentorRevisionRequestedEvent,
  VerifiedCompletionPayload,
  VerifiedCompletionEvent,
} from "./training/mentor.contracts";

// ── Trust ───────────────────────────────────────────────────────
export type {
  CredentialIssuedPayload,
  CredentialIssuedEvent,
  VerificationCompletedPayload,
  VerificationCompletedEvent,
} from "./trust/trust.contracts";

// ── Intelligence ────────────────────────────────────────────────
export type {
  SkillGapDetectedPayload,
  SkillGapDetectedEvent,
  MatchScoreUpdatedPayload,
  MatchScoreUpdatedEvent,
} from "./intelligence/intelligence.contracts";

// ── Smart Glue Intents ──────────────────────────────────────────
export type {
  CriRefreshRequestedPayload,
  MatchRefreshRequestedPayload,
  SkillGapRefreshRequestedPayload,
  TrainingRecommendationRequestedPayload,
  VerifiedStateRefreshRequestedPayload,
  ReputationRefreshRequestedPayload,
  MobilityRefreshRequestedPayload,
  WorkforceRefreshRequestedPayload,
} from "./smart-glue/intent.contracts";

// ── Commerce ────────────────────────────────────────────────────
export type {
  OrderStatus,
  TransactionStatus,
  OrderItemType,
  OrderCreatedPayload,
  PaymentInitiatedPayload,
  PaymentCompletedPayload,
  PaymentFailedPayload,
  OrderCreatedEvent,
  PaymentInitiatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from "./commerce/commerce.contracts";

export type {
  RecipientType,
  EarningsStatus,
  PayoutStatus,
  RevenueRecordedPayload,
  EarningsCreatedPayload,
  PayoutInitiatedPayload,
  PayoutCompletedPayload,
  RevenueRecordedEvent,
  EarningsCreatedEvent,
  PayoutInitiatedEvent,
  PayoutCompletedEvent,
} from "./commerce/revenue.contracts";

// ── Billing & Pricing ───────────────────────────────────────────
export type {
  PricingMode,
  ResolvedPrice,
  PriceResolvedPayload,
  ContactSalesRequestedPayload,
  QuoteRequestedPayload,
  PriceResolvedEvent,
  ContactSalesRequestedEvent,
  QuoteRequestedEvent,
} from "./commerce/billing.contracts";
