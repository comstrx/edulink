/**
 * Growth Recommendation Module — Sprint 7C
 *
 * Barrel export for hiring→growth feedback loop.
 */

// Types
export type {
  GrowthInterventionTarget,
  GrowthRecommendation,
  GrowthRecommendationTrace,
  GrowthSourceType,
  GrowthGapType,
  GrowthActionType,
  GrowthUrgency,
  GrowthRecommendationStatus,
  GrowthEngineTeacherState,
  GrowthRecommendationRefreshResult,
  HiringGrowthMappingResult,
} from "./types/growth-recommendation.types";

// Mapper
export { mapHiringToGrowth } from "./hiring-growth-mapper";
export type { HiringGrowthMapperInput } from "./hiring-growth-mapper";

// Engine
export { runGrowthRecommendationEngine } from "./growth-recommendation-engine";
export type { GrowthEngineInput, GrowthEngineResult } from "./growth-recommendation-engine";

// Writer
export {
  writeGrowthRecommendations,
  markGrowthRecommendationCompleted,
  dismissGrowthRecommendation,
} from "./growth-recommendation-writer";

// Service
export { refreshGrowthRecommendations } from "./growth-refresh.service";
export type { GrowthRefreshRequest } from "./growth-refresh.service";

// Loop Completion — Sprint 2 Step 5
export {
  completeRecommendationsForCourse,
  completeRecommendationsForCredential,
  completeCredentialRecommendationsByCredentialId,
} from "./growth-loop-completion.service";
export type { LoopCompletionResult } from "./growth-loop-completion.service";

// Domain Contract
export { GROWTH_DOMAIN, GROWTH_INPUT_SOURCES } from "./growth-domain-contract";
