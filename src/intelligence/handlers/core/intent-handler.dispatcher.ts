/**
 * Intelligence Intent Handler — Dispatcher
 *
 * Receives intents, resolves handlers, executes them.
 * Uses ExecutionContext for canonical trace propagation.
 *
 * Sprint 1 Step 3: Every intent produces a structured IntentDispatchResult
 * with traceId, intentName, normalized status, and optional metadata.
 */

import type { IntentEmission } from "@/smart-glue/types";
import type { HandlerContext, HandlerResult } from "./intent-handler.types";
import { resolveHandler } from "./intent-handler.registry";
import type { EventName } from "@/contracts/core/event-names";
import type { ExecutionContext } from "@/smart-glue/execution-context";
import { logExecution } from "@/smart-glue/execution-telemetry";

// ── Result Contract ───────────────────────────────────────────

/** Canonical status for every intent dispatch */
export type IntentOutcomeStatus = "executed" | "no_handler" | "failed";

/** Structured result for every intent dispatch — no silent outcomes */
export interface IntentDispatchResult {
  /** Trace from the pipeline ExecutionContext */
  traceId: string;
  /** The intent that was dispatched */
  intentName: string;
  /** Normalized outcome status */
  status: IntentOutcomeStatus;
  /** Handler that processed the intent (if any) */
  handlerName?: string;
  /** Reason for non-execution */
  reason?: string;
  /** Duration in ms (only when handler ran) */
  durationMs?: number;
  /** Handler result (only when status = "executed") */
  result?: HandlerResult;
}

/** Summary of a batch dispatch */
export interface IntentDispatchSummary {
  traceId: string;
  total: number;
  executed: number;
  failed: number;
  noHandler: number;
}

// ── Legacy compat (re-export for bridge cache invalidation) ───
/** @deprecated Use IntentDispatchResult.status directly */
export interface DispatchSkipped {
  intent: string;
  reason: "no_handler_registered";
}

// ── Dispatch ──────────────────────────────────────────────────

/**
 * Dispatch a single intent to its registered handler.
 * Always returns a structured IntentDispatchResult — no silent outcomes.
 */
export async function dispatchIntent(emission: IntentEmission, execCtx: ExecutionContext): Promise<IntentDispatchResult> {
  const intentName = emission.intent as EventName;

  logExecution({
    traceId: execCtx.traceId,
    stage: "intent_received",
    intentName,
  });

  const handler = resolveHandler(intentName);

  if (!handler) {
    logExecution({
      traceId: execCtx.traceId,
      stage: "handler_missing",
      intentName,
      status: "skipped",
    });
    return {
      traceId: execCtx.traceId,
      intentName,
      status: "no_handler",
      reason: "no_handler_registered",
    };
  }

  logExecution({
    traceId: execCtx.traceId,
    stage: "handler_selected",
    intentName,
    handlerName: handler.intentName,
  });

  const context: HandlerContext = {
    executedAt: new Date().toISOString(),
    correlationId: emission.meta?.triggeredByEvent,
    traceId: execCtx.traceId,
  };

  const start = performance.now();

  try {
    const result = await handler.handle(emission, context);
    const elapsed = Math.round(performance.now() - start);

    const enrichedResult = { ...result, executionTimeMs: elapsed };

    logExecution({
      traceId: execCtx.traceId,
      stage: "handler_completed",
      intentName,
      handlerName: result.handlerExecuted,
      status: result.success ? "ok" : "failed",
      durationMs: elapsed,
      meta: { outputsWritten: result.outputsWritten },
    });

    // Handler ran but returned success: false → still "executed" (handler decided to fail)
    return {
      traceId: execCtx.traceId,
      intentName,
      status: "executed",
      handlerName: result.handlerExecuted,
      durationMs: elapsed,
      result: enrichedResult,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    const errorMsg = err instanceof Error ? err.message : String(err);

    logExecution({
      traceId: execCtx.traceId,
      stage: "handler_failed",
      intentName,
      handlerName: handler.intentName,
      status: "failed",
      durationMs: elapsed,
      meta: { error: errorMsg },
    });

    return {
      traceId: execCtx.traceId,
      intentName,
      status: "failed",
      handlerName: handler.intentName,
      reason: errorMsg,
      durationMs: elapsed,
      result: {
        intent: intentName,
        handlerExecuted: handler.intentName,
        outputsWritten: [],
        executionTimeMs: elapsed,
        success: false,
        error: errorMsg,
      },
    };
  }
}

/**
 * Dispatch multiple intents. All share the same ExecutionContext.
 * Returns individual results + a summary.
 */
export async function dispatchIntents(
  emissions: IntentEmission[],
  execCtx: ExecutionContext,
): Promise<{ results: IntentDispatchResult[]; summary: IntentDispatchSummary }> {
  const results: IntentDispatchResult[] = [];
  for (const emission of emissions) {
    results.push(await dispatchIntent(emission, execCtx));
  }

  const summary: IntentDispatchSummary = {
    traceId: execCtx.traceId,
    total: results.length,
    executed: results.filter(r => r.status === "executed").length,
    failed: results.filter(r => r.status === "failed").length,
    noHandler: results.filter(r => r.status === "no_handler").length,
  };

  return { results, summary };
}
