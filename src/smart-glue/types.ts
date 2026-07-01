/**
 * Smart Glue — Shared Types
 *
 * A GlueRule maps a trigger event to one or more intent emissions.
 * Rules contain NO scoring logic — only routing decisions.
 *
 * Sprint 9: Added async context resolution for intelligence-aware rules.
 */

import type { DomainEvent } from "@/contracts/core/domain-event";
import type { EventPayloadMap } from "@/contracts/core/event-map";
import type { EventName } from "@/contracts/core/event-names";

export interface GlueRule<K extends keyof EventPayloadMap & string = any> {
  /** Unique rule identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** The trigger event this rule listens to */
  trigger: K;
  /** Execution priority — higher values run first. Default: 0 */
  priority?: number;
  /** Condition check — return true to fire intents. Default: always fire. */
  condition?: (event: DomainEvent<EventPayloadMap[K]>) => boolean;
  /** Produce intent emissions from the trigger event */
  emitIntents: (event: DomainEvent<EventPayloadMap[K]>, context?: unknown) => IntentEmission[];
  /**
   * Optional async context resolver — Sprint 9.
   * Called before emitIntents to read intelligence snapshots or external state.
   * The resolved context is passed as second arg to emitIntents.
   * Errors return undefined (rule falls back to context-free behavior).
   */
  resolveContext?: (event: DomainEvent<EventPayloadMap[K]>) => Promise<unknown>;
}


export interface IntentEmission {
  /** The intent event name to emit */
  intent: EventName;
  /** Payload for the intent event */
  payload: Record<string, unknown>;
  /** Metadata propagated from the triggering event (added by dispatcher) */
  meta?: IntentMeta;
}

export interface IntentMeta {
  /** The event name that triggered this intent */
  triggeredByEvent: string;
  /** Timestamp of the triggering event */
  triggeredAt: string;
  /** Domain of the triggering event */
  sourceDomain: string;
}

/** Result shape returned by the dispatcher */
export interface DispatchResult {
  /** The original event that was dispatched */
  event: { name: string; domain: string };
  /** Rule IDs that matched and emitted intents */
  matchedRules: string[];
  /** Rule IDs that matched the trigger but failed the condition */
  skippedRules: string[];
  /** Final deduplicated intents */
  emittedIntents: IntentEmission[];
  /** Number of intents removed by deduplication */
  dedupedCount: number;
}
