/**
 * Explainability / Confidence Layer — Barrel Export
 *
 * Read-only explanation logic that answers:
 * - Why did the system show this?
 * - What evidence supports it?
 * - How confident is the system?
 * - What signals are missing?
 */

// Types
export type {
  ExplanationContract,
  ExplanationReason,
  MissingSignal,
  EvidenceStatus,
  ConfidenceLevel,
  ExplanationAudience,
  ExplanationContext,
  ExplanationStatus,
  SourceDomain,
  SignalType,
} from "./types/explanation-contract.types";
export { EMPTY_EXPLANATION } from "./types/explanation-contract.types";

// Derivers
export { deriveTeacherFitExplanation } from "./derivers/derive-teacher-fit";
export { deriveMentorTrustExplanation } from "./derivers/derive-mentor-trust";
export { deriveProviderVisibilityExplanation } from "./derivers/derive-provider-visibility";
export type { ProviderVisibilityInput } from "./derivers/derive-provider-visibility";
export { deriveReadinessExplanation } from "./derivers/derive-readiness";

// Utils
export { deriveConfidence } from "./utils/derive-confidence";
export { filterReasonsByAudience, filterMissingSignalsByAudience, applyAudienceFilter } from "./utils/filter-by-audience";
export { mapToExplanationAudience } from "./utils/map-audience";

// Hooks
export { useTeacherFitExplanation } from "./hooks/useTeacherFitExplanation";
export { useMentorTrustExplanation } from "./hooks/useMentorTrustExplanation";
export { useProviderVisibilityExplanation } from "./hooks/useProviderVisibilityExplanation";
export { useReadinessExplanation } from "./hooks/useReadinessExplanation";
