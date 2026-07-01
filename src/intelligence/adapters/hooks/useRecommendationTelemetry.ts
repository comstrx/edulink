/**
 * useRecommendationTelemetry — UI-layer telemetry for recommendations
 *
 * Sprint 6.5 → Sprint 7.5 — Production-ready telemetry
 *
 * Emits structured telemetry events for recommendation visibility and interaction.
 * Uses ONLY existing pushTelemetryEvent — no new systems.
 *
 * UI-layer ONLY — never import into policy/core/adapters.
 */

import { useEffect, useRef, useCallback } from "react";
import { pushTelemetryEvent } from "@/intelligence/observability/inspection/trace-collector";
import { getActiveVariant, getActiveSegment } from "@/intelligence/recommendations/policy/recommendation-policy.config";
import type { UIRecommendation } from "../unified-recommendations.adapter";

/**
 * Emits "recommendation_shown" telemetry when recommendations are rendered.
 * Fires once per unique set (keyed by joined IDs).
 *
 * Runs in ALL environments (production + dev) to enable CTR measurement.
 */
export function useRecommendationShownTelemetry(
  recommendations: UIRecommendation[],
): void {
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (recommendations.length === 0) return;

    const key = recommendations.map((r) => r.id).join(",");
    if (key === lastKey.current) return;
    lastKey.current = key;

    for (const rec of recommendations) {
      pushTelemetryEvent({
        traceId: rec.traceId ?? "unknown",
        timestamp: Date.now(),
        engine: "decision-engine",
        stage: "output",
        decisionType: "recommendation_shown",
        outcome: "applied",
        metadata: {
          recommendationId: rec.id,
          actionType: rec.actionType,
          priority: rec.priority,
          source: rec.source,
          variant: getActiveVariant(),
          segment: getActiveSegment(),
        },
      });
    }
  }, [recommendations]);
}

/**
 * Returns a callback to emit "recommendation_clicked" telemetry.
 * Call this in onClick handlers BEFORE executing the action.
 *
 * Runs in ALL environments (production + dev) to enable CTR measurement.
 */
export function useRecommendationClickTelemetry(): (rec: UIRecommendation) => void {
  return useCallback((rec: UIRecommendation) => {
    pushTelemetryEvent({
      traceId: rec.traceId ?? "unknown",
      timestamp: Date.now(),
      engine: "decision-engine",
      stage: "output",
      decisionType: "recommendation_clicked",
      outcome: "applied",
      metadata: {
        recommendationId: rec.id,
        actionType: rec.actionType,
        priority: rec.priority,
        source: rec.source,
        targetId: rec.targetId ?? null,
        variant: getActiveVariant(),
        segment: getActiveSegment(),
      },
    });
  }, []);
}
