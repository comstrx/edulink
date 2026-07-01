/**
 * Provider Decision Overlay — Sprint 14 PART 4
 *
 * Modifies training completion and recommendation decisions
 * based on provider effectiveness signals.
 *
 * NOT a replacement — applied as an overlay on existing decisions.
 * No increase in recommendation count. No duplication.
 */

import type { ProviderPerformanceSummary, ProviderEffectivenessBand } from "./provider-performance.types";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";

// ── CRI Impact Modifier ──────────────────────────────────────

export interface ProviderCriOverlay {
  /** Multiplier applied to CRI refresh priority */
  priorityMultiplier: number;
  /** Whether to boost CRI refresh scope */
  boostScope: boolean;
  /** Reasoning */
  reasoning: string;
}

/**
 * Determine how provider quality affects CRI refresh priority.
 *
 * High-quality provider → stronger CRI impact (boost)
 * Low-quality provider → reduced CRI impact (dampen)
 */
export function resolveProviderCriOverlay(
  band: ProviderEffectivenessBand,
): ProviderCriOverlay {
  switch (band) {
    case "high":
      return {
        priorityMultiplier: 1.3,
        boostScope: true,
        reasoning: "high-effectiveness provider → CRI impact boosted",
      };
    case "medium":
      return {
        priorityMultiplier: 1.0,
        boostScope: false,
        reasoning: "medium-effectiveness provider → standard CRI impact",
      };
    case "low":
      return {
        priorityMultiplier: 0.7,
        boostScope: false,
        reasoning: "low-effectiveness provider → CRI impact dampened",
      };
    case "unknown":
    default:
      return {
        priorityMultiplier: 1.0,
        boostScope: false,
        reasoning: "unknown provider effectiveness → standard CRI impact",
      };
  }
}

// ── Recommendation Filtering ────────────────────────────────

export interface ProviderRecommendationOverlay {
  /** Whether to suppress recommendations from this provider */
  suppress: boolean;
  /** Rank adjustment (negative = promote, positive = demote) */
  rankAdjustment: number;
  /** Reasoning */
  reasoning: string;
}

/**
 * Determine whether to suppress or demote a recommendation
 * based on provider effectiveness.
 *
 * CRITICAL: Does NOT add new recommendations.
 * Only modifies ranking/suppression of existing ones.
 */
export function resolveProviderRecommendationOverlay(
  band: ProviderEffectivenessBand,
): ProviderRecommendationOverlay {
  switch (band) {
    case "high":
      return {
        suppress: false,
        rankAdjustment: -2, // Promote (lower rank = higher position)
        reasoning: "high-effectiveness provider → recommendations promoted",
      };
    case "medium":
      return {
        suppress: false,
        rankAdjustment: 0,
        reasoning: "medium-effectiveness provider → no rank change",
      };
    case "low":
      return {
        suppress: true,
        rankAdjustment: 5,
        reasoning: "low-effectiveness provider → recommendations suppressed",
      };
    case "unknown":
    default:
      return {
        suppress: false,
        rankAdjustment: 0,
        reasoning: "unknown provider → neutral recommendation treatment",
      };
  }
}

// ── Observability ──────────────────────────────────────────

export function logProviderDecision(
  traceId: string,
  providerId: string,
  providerBand: ProviderEffectivenessBand,
  signal: string,
  impact: "boost" | "reduce" | "suppress" | "ignore",
  details: Record<string, unknown> = {},
): void {
  logDecisionTrace({
    traceId,
    decisionType: "provider_overlay",
    entityId: providerId,
    metadata: {
      providerBand,
      signal,
      decisionImpact: impact,
      ...details,
    },
  });
}
