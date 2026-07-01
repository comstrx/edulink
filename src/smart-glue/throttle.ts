/**
 * Smart Glue — Event Throttle (Minimal, Targeted)
 *
 * Prevents repeated identical events from triggering redundant recomputation.
 * Currently scoped ONLY to identity.profile_updated.
 *
 * NOT a global throttle system. Each event type opts in explicitly.
 *
 * Pre-Sprint 10 Stabilization
 */

const THROTTLE_WINDOW_MS = 10_000; // 10 seconds

/** Events that should be throttled + their window */
const THROTTLED_EVENTS: Record<string, number> = {
  "identity.profile_updated": THROTTLE_WINDOW_MS,
};

/**
 * In-memory cache: eventKey → last dispatch timestamp.
 * Key format: `${eventName}:${entityId}`
 */
const lastDispatchMap = new Map<string, number>();

/**
 * Check if an event should be throttled (skipped).
 *
 * Returns true if the event should be SKIPPED (was fired recently).
 * Returns false if the event should PROCEED.
 */
export function shouldThrottle(
  eventName: string,
  entityId: string,
): boolean {
  const windowMs = THROTTLED_EVENTS[eventName];
  if (!windowMs) return false; // Not a throttled event

  const key = `${eventName}:${entityId}`;
  const now = Date.now();
  const lastTime = lastDispatchMap.get(key);

  if (lastTime && now - lastTime < windowMs) {
    console.log(`[IntelDecision] throttle_skip`, JSON.stringify({
      event: eventName,
      entityId,
      elapsedMs: now - lastTime,
      windowMs,
    }));
    return true;
  }

  // Record this dispatch
  lastDispatchMap.set(key, now);
  return false;
}

/**
 * Extract a stable entity ID from any event payload for throttle keying.
 */
export function extractThrottleEntityId(payload: Record<string, unknown>): string {
  return (
    (payload.userId as string) ??
    (payload.teacherId as string) ??
    (payload.profileId as string) ??
    "__unknown__"
  );
}

/** Clear throttle state (for testing) */
export function clearThrottleState(): void {
  lastDispatchMap.clear();
}
