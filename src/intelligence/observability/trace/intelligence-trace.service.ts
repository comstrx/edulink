/**
 * Intelligence Trace Service
 *
 * Lightweight service for creating and completing trace records.
 * Logs structured JSON to the console for observability.
 *
 * No persistence to DB — console-only in v1.
 *
 * Phase 10A.1
 */

import type {
  TraceRecord,
  TraceLogEntry,
  TraceStartOptions,
  TraceCompleteOptions,
  TraceFailureOptions,
} from "./intelligence-trace.types";

let counter = 0;

function generateTraceId(): string {
  counter += 1;
  const ts = Date.now().toString(36);
  const seq = counter.toString(36).padStart(4, "0");
  return `trace_${ts}_${seq}`;
}

/** In-flight traces keyed by traceId */
const activeTraces = new Map<string, TraceRecord>();

/** Completed trace log (bounded ring buffer for debugging) */
const traceLog: TraceRecord[] = [];
const MAX_TRACE_LOG = 200;

function pushToLog(record: TraceRecord) {
  traceLog.push(record);
  if (traceLog.length > MAX_TRACE_LOG) {
    traceLog.shift();
  }
}

function toLogEntry(record: TraceRecord): TraceLogEntry {
  return {
    traceId: record.traceId,
    event: record.eventName,
    intent: record.intentName,
    handler: record.handlerName,
    engine: record.engineName,
    snapshot: record.snapshotType,
    status: record.status,
    durationMs: record.durationMs,
    error: record.errorCode ?? null,
  };
}

/**
 * Start a new trace. Returns the traceId for later completion.
 */
export function traceStart(options: TraceStartOptions): string {
  const traceId = generateTraceId();
  const now = new Date().toISOString();

  const record: TraceRecord = {
    traceId,
    eventName: options.eventName ?? null,
    intentName: options.intentName,
    handlerName: options.handlerName,
    engineName: null,
    snapshotType: null,
    entityId: options.entityId,
    secondaryEntityId: options.secondaryEntityId ?? null,
    startedAt: now,
    completedAt: null,
    status: "started",
    durationMs: null,
    metadata: options.metadata,
  };

  activeTraces.set(traceId, record);

  console.log(`[IntelTrace] trace.start`, JSON.stringify(toLogEntry(record)));

  return traceId;
}

/**
 * Complete a trace successfully.
 */
export function traceComplete(traceId: string, options: TraceCompleteOptions = {}): void {
  const record = activeTraces.get(traceId);
  if (!record) {
    console.warn(`[IntelTrace] trace.complete called for unknown traceId: ${traceId}`);
    return;
  }

  const now = new Date().toISOString();
  const startMs = new Date(record.startedAt).getTime();
  const durationMs = Date.now() - startMs;

  record.status = "completed";
  record.completedAt = now;
  record.durationMs = durationMs;
  record.engineName = options.engineName ?? record.engineName;
  record.snapshotType = options.snapshotType ?? record.snapshotType;
  if (options.metadata) {
    record.metadata = { ...record.metadata, ...options.metadata };
  }

  activeTraces.delete(traceId);
  pushToLog(record);

  console.log(`[IntelTrace] trace.complete`, JSON.stringify(toLogEntry(record)));
}

/**
 * Fail a trace.
 */
export function traceFailure(traceId: string, options: TraceFailureOptions): void {
  const record = activeTraces.get(traceId);
  if (!record) {
    console.warn(`[IntelTrace] trace.failure called for unknown traceId: ${traceId}`);
    return;
  }

  const now = new Date().toISOString();
  const startMs = new Date(record.startedAt).getTime();
  const durationMs = Date.now() - startMs;

  record.status = "failed";
  record.completedAt = now;
  record.durationMs = durationMs;
  record.errorCode = options.errorCode;
  record.engineName = options.engineName ?? record.engineName;
  if (options.metadata) {
    record.metadata = { ...record.metadata, ...options.metadata };
  }

  activeTraces.delete(traceId);
  pushToLog(record);

  console.error(`[IntelTrace] trace.failure`, JSON.stringify(toLogEntry(record)));
}

/**
 * Attach snapshot write info to an active trace (called from writers).
 */
export function traceSnapshotWrite(traceId: string, snapshotType: string): void {
  const record = activeTraces.get(traceId);
  if (record) {
    record.snapshotType = snapshotType;
    console.debug(`[IntelTrace] trace.snapshot_write`, JSON.stringify({
      traceId,
      snapshot: snapshotType,
    }));
  }
}

/**
 * Get recent trace log for debugging.
 */
export function getTraceLog(): ReadonlyArray<TraceRecord> {
  return traceLog;
}

/**
 * Get active (in-flight) traces.
 */
export function getActiveTraces(): ReadonlyArray<TraceRecord> {
  return Array.from(activeTraces.values());
}

/**
 * Clear trace state (useful for tests).
 */
export function clearTraceState(): void {
  activeTraces.clear();
  traceLog.length = 0;
  counter = 0;
}
