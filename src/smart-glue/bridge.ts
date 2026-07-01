/**
 * Smart Glue Bridge — Sprint 1B (Hardened Trace Propagation)
 *
 * Single entry point for all domain events triggering intelligence updates.
 * Flow: Hook → dispatchDomainEvent() → Throttle → Rules → Intents → Handlers → Snapshots → Cache Invalidation
 *
 * Sprint 1 Step 2: All execution logging uses logExecution() for consistent observability.
 */

import type { DomainName } from "@/contracts/core/domain-event";
import { createDomainEvent } from "@/contracts/core/domain-event";
import type { EventPayloadMap } from "@/contracts/core/event-map";
import { dispatch as smartGlueDispatch } from "./dispatcher";
import { dispatchIntents } from "@/intelligence/handlers/core/intent-handler.dispatcher";
import type { IntentDispatchResult } from "@/intelligence/handlers/core/intent-handler.dispatcher";
import { shouldThrottle, extractThrottleEntityId } from "./throttle";
import { generateEntryTraceId } from "@/intelligence/observability/trace-governance";
import type { ExecutionContext } from "./execution-context";
import { logExecution } from "./execution-telemetry";
import { QueryClient } from "@tanstack/react-query";

// ── Query Client Reference ────────────────────────────────────
let _queryClient: QueryClient | null = null;

export function registerQueryClient(qc: QueryClient): void {
  _queryClient = qc;
}

// ── Snapshot → Query Key Mapping ──────────────────────────────
const SNAPSHOT_TO_QUERY_KEYS: Record<string, string[][]> = {
  intelligence_cri_snapshots: [["intelligence", "cri"], ["school_intelligence", "hiring"], ["school_intelligence", "team"]],
  intelligence_gap_snapshots: [["intelligence", "gaps"]],
  intelligence_match_snapshots: [["intelligence", "match"], ["school_intelligence", "hiring"]],
  intelligence_recommendation_snapshots: [["intelligence", "recommendations"]],
  intelligence_verified_state_snapshots: [["intelligence", "verified-state"], ["school_intelligence", "hiring"], ["school_intelligence", "team"]],
  intelligence_talent_profiles: [["intelligence", "talent_profile"]],
  growth_recommendations: [["growth_recommendations"]],
  teacher_career_states: [["career_state"]],
  reputation_events: [["prof_rep_training"], ["prof_rep_mentoring"]],
  reputation_profiles: [["prof_rep_training"], ["prof_rep_mentoring"]],
  school_workforce_profiles: [["workforce_intelligence"], ["school_intelligence", "team"]],
  department_capability_snapshots: [["workforce_intelligence"], ["school_intelligence", "team"]],
  promotion_readiness_entries: [["workforce_intelligence"], ["school_intelligence", "team"]],
};

/**
 * Dispatch a domain event through the full Smart Glue pipeline.
 * Creates a single ExecutionContext at entry and propagates it end-to-end.
 */
export async function dispatchDomainEvent<K extends keyof EventPayloadMap & string>(
  domain: DomainName,
  eventName: K,
  payload: EventPayloadMap[K],
): Promise<void> {
  const t0 = performance.now();
  try {
    // Throttle check
    const entityId = extractThrottleEntityId(payload as Record<string, unknown>);
    if (shouldThrottle(eventName, entityId)) {
      return;
    }

    // Create canonical ExecutionContext
    const execCtx: ExecutionContext = {
      traceId: generateEntryTraceId("bridge"),
      eventName,
      domain,
      entityId: entityId ?? "unknown",
    };

    logExecution({
      traceId: execCtx.traceId,
      stage: "event_received",
      eventName,
      meta: { domain },
    });

    // Create domain event
    const event = createDomainEvent(domain, eventName, payload);

    // Run through Smart Glue rules
    const result = await smartGlueDispatch(eventName, event, execCtx);

    if (result.emittedIntents.length === 0) {
      logExecution({
        traceId: execCtx.traceId,
        stage: "no_intents",
        eventName,
        meta: {
          matchedRules: result.matchedRules.length,
          skippedRules: result.skippedRules.length,
        },
      });
      return;
    }

    logExecution({
      traceId: execCtx.traceId,
      stage: "intents_emitted",
      eventName,
      meta: {
        intents: result.emittedIntents.map(i => i.intent),
        matchedRules: result.matchedRules,
        dedupedCount: result.dedupedCount,
      },
    });

    // Execute intent handlers
    const { results: handlerResults, summary } = await dispatchIntents(result.emittedIntents, execCtx);

    // Invalidate affected caches
    invalidateAffectedCaches(handlerResults, execCtx.traceId);

    // Pipeline summary
    const elapsed = Math.round(performance.now() - t0);

    logExecution({
      traceId: execCtx.traceId,
      stage: "pipeline_complete",
      eventName,
      durationMs: elapsed,
      meta: {
        domain,
        executed: summary.executed,
        failed: summary.failed,
        noHandler: summary.noHandler,
      },
    });
  } catch (err) {
    const elapsed = Math.round(performance.now() - t0);
    logExecution({
      traceId: "unknown",
      stage: "pipeline_error",
      eventName,
      status: "failed",
      durationMs: elapsed,
      meta: { error: String(err) },
    });
  }
}

// ── Cache Invalidation ────────────────────────────────────────

function invalidateAffectedCaches(results: IntentDispatchResult[], traceId: string): void {
  if (!_queryClient) return;

  const keysToInvalidate = new Set<string>();

  for (const r of results) {
    if (r.status !== "executed" || !r.result?.success) continue;

    for (const output of r.result.outputsWritten) {
      const queryKeyGroups = SNAPSHOT_TO_QUERY_KEYS[output];
      if (queryKeyGroups) {
        for (const qk of queryKeyGroups) {
          keysToInvalidate.add(JSON.stringify(qk));
        }
      }
    }
  }

  if (keysToInvalidate.size === 0) return;

  const invalidated: string[] = [];
  for (const keyJson of keysToInvalidate) {
    const queryKey = JSON.parse(keyJson) as string[];
    _queryClient.invalidateQueries({ queryKey });
    invalidated.push(queryKey.join("."));
  }

  logExecution({
    traceId,
    stage: "cache_invalidated",
    meta: { keys: invalidated },
  });
}
