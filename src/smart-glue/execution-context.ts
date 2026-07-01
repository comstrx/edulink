/**
 * Execution Context — Sprint 1 (Trace Propagation Fix)
 *
 * Shared context created ONCE at the bridge entry point
 * and passed through the entire execution pipeline:
 *   bridge → dispatcher → intent dispatcher → handlers
 *
 * This is the CANONICAL execution identity for a single pipeline run.
 */

export interface ExecutionContext {
  /** Single traceId for the entire pipeline — generated once at bridge entry */
  traceId: string;
  /** The domain event that started this pipeline */
  eventName: string;
  /** Domain of the event */
  domain: string;
  /** Primary entity (e.g. teacherId) */
  entityId: string;
}
