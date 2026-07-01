/**
 * Gap Engine v1 — Public API
 *
 * Re-exports contracts, engine, service, and writer.
 *
 * Phase 6D — Live
 */

// Types & contracts
export type {
  GapCategory,
  GapSeverity,
  GapConfidence,
  GapProfileSignals,
  GapQualificationSignals,
  GapTrustSignals,
  GapTrainingSignals,
  GapHiringSignals,
  GapMatchSignals,
  GapComputeMetadata,
  GapEngineInput,
  GapItem,
  GapEvidenceSource,
  GapGroupSummary,
  GapReasonCode,
  GapFreshness,
  GapEngineResult,
} from "./engine/gap-engine.types";

export { GAP_CATEGORY_LABELS } from "./engine/gap-engine.types";

// Rules & helpers
export {
  DEFAULT_SEVERITY_BY_CATEGORY,
  JOB_SOURCED_SEVERITY_BOOST,
  resolveConfidence,
  sortGapsByPriority,
  getHighestSeverity,
} from "./engine/gap-engine.rules";

// Engine
export { runGapEngine } from "./engine/gap-engine";

// Input assembly
export { assembleGapInput, assembleGapInputFromRaw, deriveProfileGapSignals, deriveQualificationGapSignals, deriveTrustGapSignals, deriveTrainingGapSignals, deriveHiringGapSignals, deriveMatchGapSignals } from "./engine/gap-engine.inputs";
export type { GapInputContext } from "./engine/gap-engine.inputs";

// Data loader
export type { GapRawData, GapRawTeacherProfile, GapRawVerifiedState, GapRawMatchSnapshot, GapRawApplicationHistory } from "./engine/gap-data-loader";
export { loadGapRawData } from "./engine/gap-data-loader";

// Service
export type { GapRefreshRequest, GapRefreshOutcome } from "./services/gap-refresh.service";
export { refreshGaps } from "./services/gap-refresh.service";

// Writer
export type { GapWriteOutcome } from "./writers/gap-snapshot-writer";
export { writeGapSnapshot } from "./writers/gap-snapshot-writer";
