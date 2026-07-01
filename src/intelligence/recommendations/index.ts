/**
 * Intelligence — Recommendation Engine v1
 *
 * Barrel export for recommendation architecture.
 *
 * Phase 7D — Live
 */

// Engine
export { runRecommendationEngine } from "./engine/recommendation-engine";
export type {
  RecommendationEngineInput,
  RecommendationEngineResult,
  RecommendationItem,
  RecommendationType,
  RecommendationGroupKey,
  RecommendationPriority,
  RecommendationConfidence,
  RecommendationGroupSummary,
  RecommendationReasonCode,
  RecommendationFreshness,
  RecCriSignals,
  RecGapSignals,
  RecMatchSignals,
  RecTrustSignals,
  RecProfileSignals,
  RecTrainingCatalogSignals,
  RecComputeMetadata,
} from "./engine/recommendation-engine.types";

// Rules
export {
  PRIORITY_RANK,
  CONFIDENCE_RANK,
  TYPE_TO_GROUP,
  ACTION_LABEL_KEYS,
  computeRecommendationPriority,
  computeRecommendationConfidence,
  isRecommendationEligible,
  resolveGroupKey,
} from "./engine/recommendation-engine.rules";

// Input builder
export { buildRecommendationEngineInput, assembleRecommendationInputFromRaw } from "./engine/recommendation-engine.inputs";

// Service
export { refreshRecommendations } from "./services/recommendation-refresh.service";
export type {
  RecommendationRefreshRequest,
  RecommendationRefreshOutcome,
} from "./services/recommendation-refresh.service";

// Writer
export { writeRecommendationSnapshot } from "./writers/recommendation-snapshot-writer";
export type { RecommendationWriteOutcome } from "./writers/recommendation-snapshot-writer";
