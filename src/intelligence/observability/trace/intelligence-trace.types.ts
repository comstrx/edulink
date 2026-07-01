/**
 * Intelligence Trace Types
 *
 * Defines the canonical trace record structure for observing
 * the full intelligence computation lifecycle:
 *   Event → Intent → Handler → Engine → Snapshot Write
 *
 * Phase 10A.1
 */

export type TraceStatus = "started" | "completed" | "failed";

export interface TraceRecord {
  /** Unique identifier for this trace span */
  traceId: string;
  /** Source domain event that initiated the pipeline */
  eventName: string | null;
  /** Intent emitted by Smart Glue */
  intentName: string;
  /** Handler that processed the intent */
  handlerName: string;
  /** Engine that ran the computation (if applicable) */
  engineName: string | null;
  /** Snapshot table written to */
  snapshotType: string | null;
  /** Primary entity (usually teacherId) */
  entityId: string;
  /** Secondary entity (e.g. jobId) */
  secondaryEntityId?: string | null;
  /** When the trace started */
  startedAt: string;
  /** When the trace completed or failed */
  completedAt: string | null;
  /** Current trace status */
  status: TraceStatus;
  /** Duration in milliseconds */
  durationMs: number | null;
  /** Error code or message on failure */
  errorCode?: string | null;
  /** Arbitrary metadata for debugging */
  metadata?: Record<string, unknown>;
}

/** Minimal structured log entry for console output */
export interface TraceLogEntry {
  traceId: string;
  event: string | null;
  intent: string;
  handler: string;
  engine: string | null;
  snapshot: string | null;
  status: TraceStatus;
  durationMs: number | null;
  error?: string | null;
}

/** Options for starting a new trace */
export interface TraceStartOptions {
  eventName?: string | null;
  intentName: string;
  handlerName: string;
  entityId: string;
  secondaryEntityId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Options for completing a trace */
export interface TraceCompleteOptions {
  engineName?: string | null;
  snapshotType?: string | null;
  metadata?: Record<string, unknown>;
}

/** Options for failing a trace */
export interface TraceFailureOptions {
  errorCode: string;
  engineName?: string | null;
  metadata?: Record<string, unknown>;
}
