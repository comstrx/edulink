/**
 * Explainability Contract — Sprint 5
 *
 * Canonical types for structured decision explanation.
 * Additive only — no behavioral changes.
 */

/** A single stage in the decision pipeline with its reasoning */
export interface StageReasoning {
  /** Pipeline stage identifier */
  stage: string;
  /** Human-readable reasoning entries from this stage */
  reasoning: string[];
}

/** Full explainability metadata attached to a decision output */
export interface ExplainabilityMeta {
  /** Trace ID linking to the observability pipeline */
  traceId: string;
  /** Ordered reasoning from each pipeline stage */
  stages: StageReasoning[];
  /** One-line summary of the final decision */
  summary: string;
}
