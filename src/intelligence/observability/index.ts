export {
  traceStart,
  traceComplete,
  traceFailure,
  traceSnapshotWrite,
  getTraceLog,
  getActiveTraces,
  clearTraceState,
} from "./trace/intelligence-trace.service";

export type {
  TraceRecord,
  TraceLogEntry,
  TraceStartOptions,
  TraceCompleteOptions,
  TraceFailureOptions,
  TraceStatus,
} from "./trace/intelligence-trace.types";

export { inspectTeacherSnapshots } from "./snapshot-inspector/snapshot-inspector.service";

export type {
  TeacherSnapshotInspection,
  InspectedSnapshot,
  InspectedFreshness,
  InspectedRecomputeHint,
} from "./snapshot-inspector/snapshot-inspector.types";

export { simulateRecomputePlan } from "./recompute-debug/recompute-debug.service";

export type { RecomputeDebugResult } from "./recompute-debug/recompute-debug.types";

export {
  recordEngineRun,
  inspectEngineRun,
  inspectEngineRunsByTrace,
  getEngineDebugLog,
  clearEngineDebugLog,
} from "./engine-debug/engine-debug.service";

export {
  runCriEngineDebug,
  runMatchEngineDebug,
  runGapEngineDebug,
  runRecommendationEngineDebug,
} from "./engine-debug/engine-debug.wrappers";

export type { EngineDebugRecord } from "./engine-debug/engine-debug.types";

// Sprint 5 — Explainability & Decision Logging
export { buildExplainabilityTrace } from "./explainability.builder";
export { logDecisionTrace } from "./decision-logger";
export type {
  ExplainabilityMeta,
  StageReasoning,
} from "./explainability.types";
export type {
  DecisionType,
  DecisionLogEntry,
} from "./decision-logger";
export type {
  StageInput,
  BuildExplainabilityOptions,
} from "./explainability.builder";

// Sprint 5.3 — Telemetry
export type {
  TelemetryEvent,
  TelemetryStage,
  TelemetryEngine,
  TelemetryOutcome,
} from "./telemetry.types";
export { VALID_STAGES, VALID_ENGINES } from "./telemetry.types";

// Sprint 5.5 — Inspection
export {
  buildInspectionRecord,
  collectTrace,
  clearTraceCollector,
  getStoredTraceIds,
  printInspection,
} from "./inspection";
export type {
  InspectionRecord,
  InspectionSummary,
  BuildInspectionOptions,
  PrintInspectionOptions,
} from "./inspection";

// Sprint 5.2 — Trace Governance
export {
  ensureTraceId,
  assertTraceId,
  validateTraceConsistency,
  generateEntryTraceId,
  clearTraceGovernanceState,
} from "./trace-governance";
