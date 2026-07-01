/**
 * CRI Engine v1 — Public API
 *
 * Re-exports the contracts, engine, service, and writer
 * so consumers can import from a single entry point.
 *
 * Phase 4D
 */

// Types & contracts
export type {
  CriBand,
  CriProfileSignals,
  CriTrainingSignals,
  CriTrustSignals,
  CriHiringSignals,
  CriComputeMetadata,
  CriEngineInput,
  CriComponentScore,
  CriReasonCode,
  CriFreshness,
  CriEngineResult,
} from "./engine/cri-engine.types";

export { CRI_BAND_LABELS } from "./engine/cri-engine.types";

// Rules & thresholds
export { CRI_COMPONENT_WEIGHTS, CRI_BAND_THRESHOLDS, resolveBand, clampScore } from "./engine/cri-engine.rules";

// Engine
export { runCriEngine } from "./engine/cri-engine";

// Input assembly
export { assembleCriInput, assembleCriInputFromRaw, deriveProfileSignals, deriveTrainingSignals, deriveTrustSignals, deriveHiringSignals } from "./engine/cri-engine.inputs";
export type { CriInputContext } from "./engine/cri-engine.inputs";

// Data loader
export type { CriRawData, CriRawProfile, CriRawCounts, CriRawVerifiedState, CriRawHiringAggregates } from "./engine/cri-data-loader";
export { loadCriRawData } from "./engine/cri-data-loader";

// Service
export type { CriRefreshRequest, CriRefreshOutcome } from "./services/cri-refresh.service";
export { refreshCri } from "./services/cri-refresh.service";

// Writer
export type { CriWriteOutcome } from "./writers/cri-snapshot-writer";
export { writeCriEngineSnapshot } from "./writers/cri-snapshot-writer";
