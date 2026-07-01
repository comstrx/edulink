/**
 * Trace Collector — Sprint 5.5
 *
 * In-memory telemetry event store keyed by traceId.
 * Lightweight ring buffer per trace. No persistence.
 */

import type { TelemetryEvent } from "../telemetry.types";

const MAX_TRACES = 200;
const MAX_EVENTS_PER_TRACE = 50;

const store = new Map<string, TelemetryEvent[]>();
const insertionOrder: string[] = [];

/**
 * Push a telemetry event into the collector.
 * Called from logDecisionTrace — no external usage needed.
 */
export function pushTelemetryEvent(event: TelemetryEvent): void {
  const { traceId } = event;

  let events = store.get(traceId);
  if (!events) {
    events = [];
    store.set(traceId, events);
    insertionOrder.push(traceId);

    // Evict oldest trace if over capacity
    if (insertionOrder.length > MAX_TRACES) {
      const oldest = insertionOrder.shift()!;
      store.delete(oldest);
    }
  }

  if (events.length < MAX_EVENTS_PER_TRACE) {
    events.push(event);
  }
}

/**
 * Collect all telemetry events for a given traceId.
 * Returns a copy sorted by timestamp ascending.
 */
export function collectTrace(traceId: string): TelemetryEvent[] {
  const events = store.get(traceId);
  if (!events) return [];
  return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get all stored traceIds (for debugging).
 */
export function getStoredTraceIds(): string[] {
  return [...insertionOrder];
}

/**
 * Clear collector state (for tests).
 */
export function clearTraceCollector(): void {
  store.clear();
  insertionOrder.length = 0;
}
