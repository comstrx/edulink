/**
 * Explanation Observability Tracker
 *
 * Tracks which explanations users view, for UX improvement insights.
 * Lightweight in-memory tracking — can be extended to analytics later.
 *
 * Phase 4.3 — Explainability Layer
 */

import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";

interface ExplanationViewEvent {
  signal: string;
  audience: ExposureAudience;
  timestamp: number;
}

const MAX_LOG_SIZE = 200;
const viewLog: ExplanationViewEvent[] = [];

/** Record an explanation view event */
export function trackExplanationView(signal: string, audience: ExposureAudience): void {
  if (viewLog.length >= MAX_LOG_SIZE) {
    viewLog.shift();
  }
  viewLog.push({ signal, audience, timestamp: Date.now() });

  if (process.env.NODE_ENV === "development") {
    console.debug(`[Explainability] ${audience} viewed ${signal} explanation`);
  }
}

/** Get explanation view counts grouped by signal */
export function getExplanationViewCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of viewLog) {
    counts[event.signal] = (counts[event.signal] ?? 0) + 1;
  }
  return counts;
}

/** Get full view log (for debugging) */
export function getExplanationViewLog(): readonly ExplanationViewEvent[] {
  return viewLog;
}

/** Clear view log (for testing) */
export function clearExplanationViewLog(): void {
  viewLog.length = 0;
}
