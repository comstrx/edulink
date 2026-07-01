/**
 * Trace Governance — Sprint 5.2
 *
 * Enforces single-source traceId generation and continuity.
 * traceId must be created ONCE at system entry (bridge/dispatcher)
 * and passed explicitly through all downstream layers.
 *
 * Rules:
 *   - ensureTraceId() generates ONLY at entry points
 *   - assertTraceId() validates presence in downstream layers
 *   - validateTraceConsistency() checks continuity (dev mode)
 */

let traceCounter = 0;

/**
 * Generate a new trace ID. ONLY for use at system entry points
 * (bridge, dispatcher). Never call from resolvers or overlays.
 */
export function generateEntryTraceId(prefix: string = "trace"): string {
  traceCounter += 1;
  const ts = Date.now().toString(36);
  const seq = traceCounter.toString(36).padStart(4, "0");
  return `${prefix}_${ts}_${seq}`;
}

/**
 * Ensure a traceId exists. For use ONLY at entry points.
 * - If traceId is provided → return it unchanged
 * - If missing → generate a new one + log warning
 */
export function ensureTraceId(traceId: string | undefined, source: string): string {
  if (traceId) return traceId;

  const generated = generateEntryTraceId(source);
  console.warn(`[TraceGov] missing traceId at entry (source=${source}), generated: ${generated}`);
  return generated;
}

/**
 * Assert traceId is present in downstream layers.
 * Logs a warning if missing — does NOT generate a new one.
 * Returns the traceId or a fallback for safe operation.
 */
export function assertTraceId(traceId: string | undefined, layer: string): string {
  if (traceId) return traceId;

  const fallback = `orphan_${layer}_${Date.now().toString(36)}`;
  console.warn(`[TraceGov] traceId missing in downstream layer (layer=${layer}), using fallback: ${fallback}`);
  return fallback;
}

/**
 * Validate trace consistency across pipeline stages.
 * Logs warning if traceIds don't match.
 * No-op in production — lightweight check for debugging.
 */
export function validateTraceConsistency(
  expected: string,
  actual: string,
  stage: string,
): boolean {
  if (expected === actual) return true;

  console.warn(`[TraceGov] trace mismatch at ${stage}: expected=${expected}, actual=${actual}`);
  return false;
}

/** Clear counter (for testing) */
export function clearTraceGovernanceState(): void {
  traceCounter = 0;
}
