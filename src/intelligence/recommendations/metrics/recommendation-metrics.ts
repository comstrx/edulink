/**
 * Recommendation Metrics Summary — Sprint 8
 *
 * Computes CTR, completion rate, and drop-off from in-memory telemetry events.
 * Groups results by A/B variant for comparison.
 *
 * Uses ONLY existing trace-collector data — no new systems.
 */

import { getStoredTraceIds, collectTrace } from "@/intelligence/observability/inspection/trace-collector";
import { getActiveVariant, type PolicyVariant } from "../policy/recommendation-policy.config";

export interface VariantMetrics {
  variant: PolicyVariant;
  shown: number;
  clicked: number;
  executed: number;
  ctr: number;
  completionRate: number;
  dropOff: number;
}

export interface MetricsSummary {
  variantA: VariantMetrics;
  variantB: VariantMetrics;
  activeVariant: PolicyVariant;
}

function emptyMetrics(variant: PolicyVariant): VariantMetrics {
  return { variant, shown: 0, clicked: 0, executed: 0, ctr: 0, completionRate: 0, dropOff: 0 };
}

/**
 * Compute recommendation metrics from in-memory telemetry.
 * Groups by variant tag embedded in telemetry metadata.
 */
export function getRecommendationMetricsSummary(): MetricsSummary {
  const traceIds = getStoredTraceIds();
  const a = emptyMetrics("A");
  const b = emptyMetrics("B");

  for (const traceId of traceIds) {
    const events = collectTrace(traceId);
    // Determine variant from the first event that has it, or default to active
    let variant: PolicyVariant = getActiveVariant();
    for (const e of events) {
      if (e.metadata?.variant) {
        variant = e.metadata.variant as PolicyVariant;
        break;
      }
    }

    const bucket = variant === "A" ? a : b;

    for (const e of events) {
      if (e.decisionType === "recommendation_shown") bucket.shown++;
      if (e.decisionType === "recommendation_clicked") bucket.clicked++;
      if (e.decisionType === "recommendation_executed") bucket.executed++;
    }
  }

  // Compute rates
  for (const m of [a, b]) {
    m.ctr = m.shown > 0 ? Math.round((m.clicked / m.shown) * 1000) / 10 : 0;
    m.completionRate = m.clicked > 0 ? Math.round((m.executed / m.clicked) * 1000) / 10 : 0;
    m.dropOff = m.shown > 0 ? Math.round(((m.shown - m.clicked) / m.shown) * 1000) / 10 : 0;
  }

  return {
    variantA: a,
    variantB: b,
    activeVariant: getActiveVariant(),
  };
}
