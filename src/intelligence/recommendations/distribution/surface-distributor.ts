/**
 * Surface Distributor — Pure Distribution Function
 *
 * Takes orchestrator output + surface type → returns filtered items.
 * No hooks, no side effects, no data fetching.
 *
 * This is the ONLY place where surface-specific filtering happens.
 * Components should NOT duplicate this logic locally.
 *
 * HARDENING: Distribution is fully rule-based via surface contracts.
 * No cross-surface dependencies. Each surface's output is determined
 * solely by its own contract — not by what another surface selects.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";
import type { OrchestratorOutput } from "../orchestrator/recommendation-orchestrator";
import {
  type SurfaceType,
  type SurfaceContract,
  type SurfaceRecommendations,
  SURFACE_CONTRACTS,
} from "./surface-contracts";

// ── Core Distribution ─────────────────────────────────────────

/**
 * Distributes recommendations for a specific surface.
 * Each surface is independently filtered by its own contract.
 * No cross-surface coupling or dashboard-first dependency.
 */
export function distributeForSurface(
  output: OrchestratorOutput,
  surface: SurfaceType,
): SurfaceRecommendations {
  const contract = SURFACE_CONTRACTS[surface];

  // 1. Pick source list
  const source = contract.sourceList === "exposed" ? output.exposed : output.full;
  const totalBeforeFilter = source.length;

  // 2. Apply contract-based filters (no cross-surface refs)
  let items = applyContractFilters(source, contract);

  // 3. Cap to maxItems
  items = items.slice(0, contract.maxItems);

  // 4. Derive primary action for action_owner surfaces
  const primaryAction =
    contract.ownershipMode === "action_owner"
      ? items.find((r) => r.status !== "completed")
      : undefined;

  return {
    surface,
    items,
    primaryAction,
    totalBeforeFilter,
  };
}

// ── Internal Filters ──────────────────────────────────────────

function applyContractFilters(
  items: UIRecommendation[],
  contract: SurfaceContract,
): UIRecommendation[] {
  let result = items;

  // Filter completed items
  if (!contract.includeCompleted) {
    result = result.filter((r) => r.status !== "completed");
  }

  // Filter by allowed groupKeys
  if (contract.allowedGroupKeys.length > 0) {
    result = result.filter(
      (r) => r.groupKey && contract.allowedGroupKeys.includes(r.groupKey),
    );
  }

  // Filter by forbidden groupKeys
  if (contract.forbiddenGroupKeys.length > 0) {
    result = result.filter(
      (r) => !r.groupKey || !contract.forbiddenGroupKeys.includes(r.groupKey),
    );
  }

  return result;
}
