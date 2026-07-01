/**
 * Engine Debug — Service
 *
 * Records and queries engine input/output snapshots keyed by traceId.
 * In-memory ring buffer for developer debugging.
 *
 * Phase 10A.4
 */

import type { EngineDebugRecord } from "./engine-debug.types";

const debugLog: EngineDebugRecord[] = [];
const MAX_LOG = 200;

/**
 * Record an engine run for later inspection.
 */
export function recordEngineRun(record: EngineDebugRecord): void {
  debugLog.push(record);
  if (debugLog.length > MAX_LOG) {
    debugLog.shift();
  }
  console.debug("[EngineDebug] Recorded", {
    traceId: record.traceId,
    engine: record.engineName,
    reasonCodes: record.reasonCodes.length,
  });
}

/**
 * Inspect an engine run by traceId.
 */
export function inspectEngineRun(traceId: string): EngineDebugRecord | null {
  return debugLog.find((r) => r.traceId === traceId) ?? null;
}

/**
 * Get all debug records for a traceId (multiple engines may run per trace).
 */
export function inspectEngineRunsByTrace(traceId: string): EngineDebugRecord[] {
  return debugLog.filter((r) => r.traceId === traceId);
}

/**
 * Get recent engine debug log.
 */
export function getEngineDebugLog(): ReadonlyArray<EngineDebugRecord> {
  return debugLog;
}

/**
 * Clear debug state (useful for tests).
 */
export function clearEngineDebugLog(): void {
  debugLog.length = 0;
}
