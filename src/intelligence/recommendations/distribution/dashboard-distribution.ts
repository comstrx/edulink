/**
 * Dashboard Distribution — Surface-specific slice
 *
 * Splits orchestrator output into dashboard-specific view:
 * - primaryAction: single top-priority non-completed item
 * - secondaryActions: remaining items excluding primary (no duplication)
 * - all: full exposed list for the surface
 *
 * Pure function — no hooks, no side effects.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

export interface DashboardDistribution {
  /** Single top-priority active recommendation (DailyActionCard) */
  primaryAction: UIRecommendation | undefined;
  /** Remaining active items excluding primary (GrowthActionsCard) */
  secondaryActions: UIRecommendation[];
  /** All items for this surface (including completed for display) */
  all: UIRecommendation[];
  /** Whether any actionable recommendations exist */
  hasActions: boolean;
}

export function distributeDashboard(
  exposedItems: UIRecommendation[],
): DashboardDistribution {
  const active = exposedItems.filter((r) => r.status !== "completed");

  const primaryAction = active[0];

  const secondaryActions = primaryAction
    ? active.filter((r) => r.id !== primaryAction.id)
    : [];

  return {
    primaryAction,
    secondaryActions,
    all: exposedItems,
    hasActions: active.length > 0,
  };
}
