/**
 * Career Growth Read Layer — Barrel Export
 *
 * Intelligence-only growth summary + identity display hooks.
 *
 * ⚠️ Readiness level is NOT part of this layer.
 * Use useCanonicalReadiness from @/intelligence/readiness instead.
 *
 * Sprint 2.2 — Intelligence Consumption Convergence
 */

// Types
export type {
  GrowthSummary,
  GrowthResolvedState,
  SkillGapEntry,
  TrainingProgressSummary,
  CredentialSummary,
  GrowthSignalFlags,
  HiringSignals,
} from "./types/growth-summary.types";

// Hooks
export { useGrowthSummary } from "./hooks/useGrowthSummary";
export { useGrowthRecommendations } from "./hooks/useGrowthRecommendations";
export type { GrowthRecommendationEntry, GrowthRecommendationsResult } from "./hooks/useGrowthRecommendations";
export { useSkillProfileDisplay } from "./hooks/useSkillProfileDisplay";
export type { SkillDisplayEntry } from "./hooks/useSkillProfileDisplay";
