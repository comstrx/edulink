/**
 * Recommendation Orchestrator — Sprint 6
 *
 * Platform-level entry point for recommendation pipeline.
 * Delegates to Policy Core for decision logic, then applies
 * surface-specific exposure rules.
 *
 * This is the ONLY place where policy + exposure are composed.
 * Role adapters (teacher, school) consume the orchestrator output.
 *
 * Pure function — no hooks, no side effects, no DB calls.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";
import { applyRecommendationPolicy, applyExposureRules } from "../policy/recommendation-policy.core";

// ── Input / Output Contracts ──────────────────────────────────

export interface OrchestratorInput {
  /** Engine (snapshot) recommendations, already mapped to UI shape */
  snapshotMapped: UIRecommendation[];
  /** Growth recommendations, already mapped to UI shape */
  growthMapped: UIRecommendation[];
}

export interface OrchestratorOutput {
  /** Full sequenced list (no caps) — for exploration surfaces */
  full: UIRecommendation[];
  /** Surface-capped list (max 5, 2/group) — for dashboard surfaces */
  exposed: UIRecommendation[];
}

// ── Orchestrator ──────────────────────────────────────────────

/**
 * Runs the full recommendation pipeline:
 * 1. Policy Core: merge → dedup → priority → suppression → sequencing
 * 2. Exposure: surface-specific capping
 *
 * Returns both full and exposed lists for role adapters to consume.
 */
export function getRecommendationsOrchestrated(
  input: OrchestratorInput,
): OrchestratorOutput {
  const full = applyRecommendationPolicy(input.snapshotMapped, input.growthMapped);
  const exposed = applyExposureRules(full);

  return { full, exposed };
}
