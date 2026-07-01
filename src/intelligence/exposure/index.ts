/**
 * Intelligence Exposure Layer — Barrel Export
 *
 * Single entry point for audience-scoped intelligence access.
 *
 * Phase 4.1 — Intelligence Governance
 */

// Types
export type {
  ExposureAudience,
  ExposureLevel,
  CriExposed,
  CriExposedFull,
  CriExposedSummary,
  MatchExposed,
  MatchExposedFull,
  MatchExposedSummary,
  GapExposed,
  GapExposedFull,
  GapExposedSummary,
  RecommendationExposed,
  RecommendationExposedFull,
  RecommendationExposedSummary,
  VerificationExposed,
  VerificationExposedFull,
  VerificationExposedBadge,
  RejectionExposed,
  RejectionExposedSchool,
  RejectionExposedTeacher,
  ExposedHidden,
} from "./types/exposure.types";

// Rules
export { EXPOSURE_MATRIX, getExposureLevel } from "./rules/exposure-rules";
export type { IntelligenceOutput } from "./rules/exposure-rules";

// Adapters
export { exposeCri } from "./adapters/cri-exposure.adapter";
export { exposeMatch } from "./adapters/match-exposure.adapter";
export { exposeGap } from "./adapters/gap-exposure.adapter";
export { exposeRecommendation } from "./adapters/recommendation-exposure.adapter";
export { exposeVerification } from "./adapters/verification-exposure.adapter";
export { exposeRejection } from "./adapters/rejection-exposure.adapter";

// Hooks
export {
  useExposureAudience,
  resolveExposureAudience,
  useExposedCri,
  useExposedMatch,
  useExposedGap,
  useExposedRecommendation,
  useExposedVerification,
} from "./hooks";
export type { ExposedResult } from "./hooks";
