/**
 * Intelligence Intent Handler — Core Types
 *
 * Generic handler contract for processing Smart Glue intents.
 * Handlers are the bridge between intent signals and read-model writes.
 *
 * Rules:
 * - One handler per intent
 * - Handlers must be deterministic
 * - Handlers must NOT mutate source domain state
 * - Handlers may read domain data
 * - Handlers may write Intelligence Read Models
 *
 * Phase 3A — Intent Handler Infrastructure
 */

import type { IntentEmission } from "@/smart-glue/types";
import type { EventName } from "@/contracts/core/event-names";

/** Context passed to every handler execution */
export interface HandlerContext {
  /** Timestamp when execution started */
  executedAt: string;
  /** Optional correlation ID for tracing */
  correlationId?: string;
  /** Trace ID — always present, propagated from bridge ExecutionContext */
  traceId: string;
}

/** Structured result returned after handler execution */
export interface HandlerResult {
  /** The intent that was processed */
  intent: string;
  /** ID of the handler that executed */
  handlerExecuted: string;
  /** Read models that were written/updated */
  outputsWritten: string[];
  /** Execution duration in milliseconds */
  executionTimeMs: number;
  /** Whether the handler completed successfully */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
}

/** Generic handler interface — one per intent */
export interface IntentHandler<TPayload = Record<string, unknown>> {
  /** The intent event name this handler processes */
  intentName: EventName;
  /** Human-readable description */
  description: string;
  /** Execute the handler for a given intent emission */
  handle(intent: IntentEmission & { payload: TPayload }, context: HandlerContext): Promise<HandlerResult>;
}
