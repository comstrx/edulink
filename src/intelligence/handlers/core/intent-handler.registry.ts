/**
 * Intelligence Intent Handler — Registry
 *
 * Central mapping of intent names to their handlers.
 * Enforces one handler per intent.
 *
 * Phase 3A — Intent Handler Infrastructure
 */

import type { IntentHandler } from "./intent-handler.types";
import type { EventName } from "@/contracts/core/event-names";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlerMap = new Map<EventName, IntentHandler<any>>();

/** Register a handler for an intent. Throws if already registered. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerHandler(handler: IntentHandler<any>): void {
  if (handlerMap.has(handler.intentName)) {
    throw new Error(
      `[HandlerRegistry] Duplicate handler for intent "${handler.intentName}". Only one handler per intent is allowed.`,
    );
  }
  handlerMap.set(handler.intentName, handler);
  console.log(`[HandlerRegistry] Registered: ${handler.intentName} → ${handler.description}`);
}

/** Resolve handler for an intent name. Returns undefined if not found. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveHandler(intentName: EventName): IntentHandler<any> | undefined {
  return handlerMap.get(intentName);
}

/** Get all registered handler intent names */
export function getRegisteredIntents(): EventName[] {
  return Array.from(handlerMap.keys());
}

/** Clear all registrations (useful for testing) */
export function clearRegistry(): void {
  handlerMap.clear();
}
