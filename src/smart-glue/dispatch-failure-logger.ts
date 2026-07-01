/**
 * Dispatch Failure Logger
 *
 * Replaces silent .catch(() => {}) on dispatchDomainEvent calls
 * with structured warning logs for observability.
 */

export function logDispatchFailure(eventName: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.warn(
    `[SmartGlue:Dispatch] Event dispatch failed`,
    JSON.stringify({ eventName, error: msg, timestamp: Date.now() }),
  );
}
