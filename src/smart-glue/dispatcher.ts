/**
 * Smart Glue — Dispatcher
 *
 * Evaluates rules for a given domain event and returns
 * a structured result with deduplicated, metadata-enriched intents.
 *
 * No scoring logic. No side effects beyond console logging.
 *
 * Sprint 1B: Accepts ExecutionContext from bridge for canonical trace propagation.
 * Fallback traceId is generated ONLY when called directly from tests without context.
 */

import type { DomainEvent } from "@/contracts/core/domain-event";
import type { EventPayloadMap } from "@/contracts/core/event-map";
import type { IntentEmission, IntentMeta, DispatchResult } from "./types";
import { getRulesForEvent } from "./rule-registry";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import type { ExecutionContext } from "./execution-context";
import { logExecution } from "./execution-telemetry";

// ── Dedupe Helper ──────────────────────────────────────────────

/**
 * Remove duplicate intents from an array.
 * Two intents are duplicates if they share: intent name + entityId + reason.
 * Preserves deterministic ordering — keeps the first occurrence.
 */
export function dedupeIntents(intents: IntentEmission[]): {
  deduped: IntentEmission[];
  removedCount: number;
} {
  const seen = new Set<string>();
  const deduped: IntentEmission[] = [];

  for (const emission of intents) {
    const entityId =
      (emission.payload.teacherId as string) ??
      (emission.payload.jobId as string) ??
      "__none__";
    const reason =
      (emission.payload.triggeredBy as string) ?? "__none__";
    const key = `${emission.intent}:${entityId}:${reason}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(emission);
    }
  }

  return { deduped, removedCount: intents.length - deduped.length };
}

// ── Metadata Enrichment ────────────────────────────────────────

function enrichWithMeta(
  intents: IntentEmission[],
  event: DomainEvent,
): IntentEmission[] {
  const meta: IntentMeta = {
    triggeredByEvent: event.event,
    triggeredAt: event.timestamp,
    sourceDomain: event.domain,
  };

  return intents.map((emission) => ({
    ...emission,
    meta,
  }));
}

// ── Dispatcher ─────────────────────────────────────────────────

/**
 * Dispatch a domain event through the Smart Glue rules layer.
 *
 * @param eventName - The event to dispatch
 * @param event - The domain event object
 * @param execCtxOrTraceId - ExecutionContext (canonical) or raw traceId string (test fallback)
 *
 * When called from bridge: receives full ExecutionContext.
 * When called from tests: receives nothing — generates a fallback traceId with governance warning.
 */
export async function dispatch<K extends keyof EventPayloadMap & string>(
  eventName: K,
  event: DomainEvent<EventPayloadMap[K]>,
  execCtxOrTraceId?: ExecutionContext | string,
): Promise<DispatchResult> {
  // Resolve traceId from ExecutionContext, raw string, or fallback
  let traceId: string;
  if (typeof execCtxOrTraceId === "object" && execCtxOrTraceId?.traceId) {
    traceId = execCtxOrTraceId.traceId;
  } else if (typeof execCtxOrTraceId === "string") {
    traceId = execCtxOrTraceId;
  } else {
    traceId = `dispatch_fallback_${Date.now().toString(36)}`;
    logExecution({
      traceId,
      stage: "governance_fallback",
      eventName,
      status: "warn",
      meta: { reason: "dispatcher called without ExecutionContext (expected in tests only)" },
    });
  }

  const rules = getRulesForEvent(eventName);

  // Sort by priority (highest first), default 0
  const sorted = [...rules].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  const matchedRules: string[] = [];
  const skippedRules: string[] = [];
  let rawIntents: IntentEmission[] = [];

  for (const rule of sorted) {
    // Check condition
    if (rule.condition && !rule.condition(event)) {
      skippedRules.push(rule.id);
      continue;
    }

    matchedRules.push(rule.id);

    // Sprint 9: Resolve async context if the rule defines resolveContext
    let context: unknown = undefined;
    if (rule.resolveContext) {
      try {
        context = await rule.resolveContext(event);
      } catch (err) {
        console.warn(`[IntelDecision] context_resolution_failed`, JSON.stringify({ rule: rule.id, error: String(err) }));
      }
    }

    const emitted = rule.emitIntents(event, context);
    rawIntents = rawIntents.concat(emitted);
  }

  // Enrich with metadata from the source event
  const enriched = enrichWithMeta(rawIntents, event as DomainEvent);

  // Deduplicate
  const { deduped, removedCount } = dedupeIntents(enriched);

  // Unified logging
  logDecisionTrace({
    traceId,
    decisionType: "multi_event",
    eventName,
    metadata: {
      matchedRuleIds: matchedRules,
      skippedRuleIds: skippedRules,
      emittedIntentNames: deduped.map((i) => i.intent),
      dedupedIntentCount: removedCount,
    },
  });

  return {
    event: { name: eventName, domain: event.domain },
    matchedRules,
    skippedRules,
    emittedIntents: deduped,
    dedupedCount: removedCount,
  };
}
