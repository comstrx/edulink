/**
 * Intelligence Consumption Layer — Barrel Export
 *
 * Single entry point for UI components to access intelligence data.
 *
 * Step 8A — Consumption Contracts
 */

// ── Types ──────────────────────────────────────────────────────
export type {
  ConsumptionStatus,
  ConsumptionMeta,
  ConsumptionResult,
  CriConsumptionData,
  MatchConsumptionData,
  GapConsumptionData,
  RecommendationConsumptionData,
  VerifiedStateConsumptionData,
  CriConsumptionResult,
  MatchConsumptionResult,
  GapConsumptionResult,
  RecommendationConsumptionResult,
  VerifiedStateConsumptionResult,
} from "./types/intelligence-consumption.types";

// ── Selectors ──────────────────────────────────────────────────
export {
  selectTeacherCriSnapshot,
  selectTeacherJobMatchSnapshot,
  selectTeacherGapSnapshot,
  selectTeacherRecommendationsSnapshot,
  selectTeacherVerifiedStateSnapshot,
} from "./selectors/intelligence-consumption.selectors";

// ── Adapters ───────────────────────────────────────────────────
export {
  adaptCriSnapshot,
  adaptMatchSnapshot,
  adaptGapSnapshot,
  adaptRecommendationSnapshot,
  adaptVerifiedStateSnapshot,
  errorResult,
  loadingResult,
} from "./adapters/intelligence-consumption.adapters";

// ── Hooks ──────────────────────────────────────────────────────
export {
  useTeacherCriSnapshot,
  useTeacherJobMatchSnapshot,
  useTeacherGapSnapshot,
  useTeacherRecommendationsSnapshot,
  useTeacherVerifiedStateSnapshot,
} from "./hooks";
