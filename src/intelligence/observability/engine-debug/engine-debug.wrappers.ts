/**
 * Engine Debug — Wrappers
 *
 * Thin wrappers around pure engines that record inputs/outputs
 * to the debug log when a traceId is provided.
 *
 * Phase 10A.4
 */

import { runCriEngine } from "@/intelligence/cri/engine/cri-engine";
import { runMatchEngine } from "@/intelligence/matching/engine/match-engine";
import { runGapEngine } from "@/intelligence/gaps/engine/gap-engine";
import { runRecommendationEngine } from "@/intelligence/recommendations/engine/recommendation-engine";
import type { CriEngineResult } from "@/intelligence/cri/engine/cri-engine.types";
import type { MatchEngineResult } from "@/intelligence/matching/engine/match-engine.types";
import type { GapEngineResult } from "@/intelligence/gaps/engine/gap-engine.types";
import type { RecommendationEngineResult } from "@/intelligence/recommendations/engine/recommendation-engine.types";
import { recordEngineRun } from "./engine-debug.service";

function toPlain(obj: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}

export function runCriEngineDebug(input: Parameters<typeof runCriEngine>[0], traceId?: string): CriEngineResult {
  const start = performance.now();
  const result = runCriEngine(input);
  const durationMs = Math.round(performance.now() - start);
  if (traceId) {
    recordEngineRun({
      traceId,
      engineName: "cri-engine-v1",
      inputSnapshot: toPlain(input),
      outputSnapshot: toPlain(result),
      reasonCodes: [...(result.reasonCodes ?? [])].map((c) => `${c}`),
      timestamp: new Date().toISOString(),
      durationMs,
    });
  }
  return result;
}

export function runMatchEngineDebug(input: Parameters<typeof runMatchEngine>[0], traceId?: string): MatchEngineResult {
  const start = performance.now();
  const result = runMatchEngine(input);
  const durationMs = Math.round(performance.now() - start);
  if (traceId) {
    recordEngineRun({
      traceId,
      engineName: "match-engine-v1",
      inputSnapshot: toPlain(input),
      outputSnapshot: toPlain(result),
      reasonCodes: [...(result.reasonCodes ?? [])].map((c) => `${c}`),
      timestamp: new Date().toISOString(),
      durationMs,
    });
  }
  return result;
}

export function runGapEngineDebug(input: Parameters<typeof runGapEngine>[0], traceId?: string): GapEngineResult {
  const start = performance.now();
  const result = runGapEngine(input);
  const durationMs = Math.round(performance.now() - start);
  if (traceId) {
    recordEngineRun({
      traceId,
      engineName: "gap-engine-v1",
      inputSnapshot: toPlain(input),
      outputSnapshot: toPlain(result),
      reasonCodes: [...(result.reasonCodes ?? [])].map((c) => `${c}`),
      timestamp: new Date().toISOString(),
      durationMs,
    });
  }
  return result;
}

export function runRecommendationEngineDebug(input: Parameters<typeof runRecommendationEngine>[0], traceId?: string): RecommendationEngineResult {
  const start = performance.now();
  const result = runRecommendationEngine(input);
  const durationMs = Math.round(performance.now() - start);
  if (traceId) {
    recordEngineRun({
      traceId,
      engineName: "recommendation-engine-v1",
      inputSnapshot: toPlain(input),
      outputSnapshot: toPlain(result),
      reasonCodes: [...(result.reasonCodes ?? [])].map((c) => `${c}`),
      timestamp: new Date().toISOString(),
      durationMs,
    });
  }
  return result;
}
