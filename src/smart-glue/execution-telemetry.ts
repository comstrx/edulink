/**
 * Smart Glue — Execution Telemetry
 *
 * Lightweight structured logger for the Smart Glue execution spine.
 * Replaces scattered console.log/warn/error calls with a single
 * consistent output format across: bridge → dispatcher → intent dispatcher → handlers.
 *
 * Sprint 1 — Step 2
 */

export type ExecutionStage =
  | "event_received"
  | "event_throttled"
  | "event_dispatched"
  | "no_intents"
  | "intents_emitted"
  | "intent_received"
  | "handler_selected"
  | "handler_missing"
  | "handler_completed"
  | "handler_failed"
  | "pipeline_complete"
  | "pipeline_error"
  | "cache_invalidated"
  | "governance_fallback"
  | "workforce_feedback_executed"
  | "mobility_feedback_executed";

export interface ExecutionLogEntry {
  traceId: string;
  stage: ExecutionStage;
  eventName?: string;
  intentName?: string;
  handlerName?: string;
  status?: "ok" | "skipped" | "failed" | "warn";
  durationMs?: number;
  meta?: Record<string, unknown>;
}

/**
 * Emit a structured execution log for the Smart Glue pipeline.
 * Uses console.warn for governance/failure stages, console.log otherwise.
 */
export function logExecution(entry: ExecutionLogEntry): void {
  const payload: Record<string, unknown> = {
    traceId: entry.traceId,
    stage: entry.stage,
  };

  if (entry.eventName) payload.event = entry.eventName;
  if (entry.intentName) payload.intent = entry.intentName;
  if (entry.handlerName) payload.handler = entry.handlerName;
  if (entry.status) payload.status = entry.status;
  if (entry.durationMs !== undefined) payload.durationMs = entry.durationMs;
  if (entry.meta) Object.assign(payload, entry.meta);

  const json = JSON.stringify(payload);

  if (entry.stage === "handler_failed" || entry.stage === "pipeline_error") {
    console.error(`[SmartGlue:Exec] ${json}`);
  } else if (entry.stage === "governance_fallback" || entry.stage === "handler_missing") {
    console.warn(`[SmartGlue:Exec] ${json}`);
  } else {
    console.log(`[SmartGlue:Exec] ${json}`);
  }
}
