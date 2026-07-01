/**
 * Telemetry Schema — Sprint 5.3
 *
 * Unified structured telemetry contract for all intelligence decisions.
 * JSON-safe, lightweight, no functions or circular references.
 */

/** Allowed pipeline stage identifiers */
export type TelemetryStage =
  | "rule"
  | "decision"
  | "selection"
  | "provider"
  | "overlay"
  | "feedback"
  | "safety"
  | "output";

/** Allowed engine identifiers */
export type TelemetryEngine =
  | "decision-engine"
  | "provider-intelligence"
  | "feedback-system"
  | "safety-pipeline"
  | "cross-domain"
  | "dispatcher"
  | "context-reader";

/** Standardized decision outcomes */
export type TelemetryOutcome =
  | "applied"
  | "skipped"
  | "no-op"
  | "fallback"
  | "blocked";

/** Structured telemetry event emitted by the intelligence layer */
export interface TelemetryEvent {
  traceId: string;
  timestamp: number;
  engine: TelemetryEngine;
  stage: TelemetryStage;
  decisionType?: string;
  outcome?: TelemetryOutcome;
  metadata?: Record<string, unknown>;
}

/** Valid stage values for runtime validation */
export const VALID_STAGES: ReadonlySet<TelemetryStage> = new Set([
  "rule", "decision", "selection", "provider", "overlay", "feedback", "safety", "output",
]);

/** Valid engine values for runtime validation */
export const VALID_ENGINES: ReadonlySet<TelemetryEngine> = new Set([
  "decision-engine", "provider-intelligence", "feedback-system",
  "safety-pipeline", "cross-domain", "dispatcher", "context-reader",
]);
