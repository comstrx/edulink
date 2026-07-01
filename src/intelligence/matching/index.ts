/**
 * Match Engine v1 — Public API
 *
 * Re-exports contracts, engine, service, and writer.
 *
 * Phase 5B
 */

// Types & contracts
export type {
  MatchBand,
  MatchTeacherProfileSignals,
  MatchTeacherQualificationSignals,
  MatchTeacherTrustSignals,
  MatchTeacherTrainingSignals,
  MatchJobRequirementSignals,
  MatchComputeMetadata,
  MatchEngineInput,
  MatchEligibilityFlags,
  MatchComponentScore,
  MatchReasonCode,
  MatchSignalEntry,
  MatchFreshness,
  MatchEngineResult,
} from "./engine/match-engine.types";

export { MATCH_BAND_LABELS } from "./engine/match-engine.types";

// Rules & thresholds
export {
  MATCH_COMPONENT_WEIGHTS,
  MATCH_BAND_THRESHOLDS,
  HARD_REQUIREMENT_COMPONENTS,
  resolveMatchBand,
  clampMatchScore,
  overlapRatio,
} from "./engine/match-engine.rules";

// Engine
export { runMatchEngine } from "./engine/match-engine";

// Input assembly
export { assembleMatchInput, assembleMatchInputFromRaw, deriveTeacherProfileSignals, deriveTeacherQualificationSignals, deriveTeacherTrustSignals, deriveTeacherTrainingSignals, deriveJobRequirementSignals } from "./engine/match-engine.inputs";
export type { MatchInputContext } from "./engine/match-engine.inputs";

// Data loader
export type { MatchRawData, MatchRawTeacherProfile, MatchRawTeacherQualifications, MatchRawVerifiedState, MatchRawJob, MatchRawJobSkillReq, MatchRawJobLangReq } from "./engine/match-data-loader";
export { loadMatchRawData } from "./engine/match-data-loader";

// Service
export type { MatchRefreshRequest, MatchRefreshOutcome } from "./services/match-refresh.service";
export { refreshMatch } from "./services/match-refresh.service";

// Writer
export type { MatchWriteOutcome } from "./writers/match-snapshot-writer";
export { writeMatchSnapshot } from "./writers/match-snapshot-writer";
