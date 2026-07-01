/**
 * useGrowthRecommendations — Canonical Growth Recommendations Reader
 *
 * Reads individual growth recommendations from growth_recommendations table.
 * Uses canonical normalization for source_type and action_type.
 *
 * This is the ONLY hook that surfaces individual Growth recommendations.
 * For aggregate Growth signals, use useGrowthSummary instead.
 *
 * Sprint 2 Step 3 — Growth Output & Reader Stabilization
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSourceType, normalizeActionType, actionTypeLabel } from "@/lib/growth/growth-normalization";

// ── Types ──────────────────────────────────────────────────────

export type GrowthRecommendationStatus = "active" | "completed" | "dismissed" | "stale";

export interface GrowthRecommendationEntry {
  id: string;
  teacherId: string;

  /** Canonical source type (normalized) */
  sourceType: string;
  sourceTermIds: string[];

  /** Canonical action type (normalized) */
  actionType: string;
  /** Human-readable action label */
  actionLabel: string;

  /** Engine-generated reason text */
  reason: string;

  /** Recommended item reference (if resolved) */
  recommendedItemId: string | null;
  recommendedItemType: string | null;

  /** Priority from engine (higher = more urgent) */
  priorityScore: number;

  status: GrowthRecommendationStatus;

  createdAt: string;
  updatedAt: string;
}

export interface GrowthRecommendationsResult {
  recommendations: GrowthRecommendationEntry[];
  activeCount: number;
  completedCount: number;
  isLoading: boolean;
  error: string | null;
}

// ── Hook ───────────────────────────────────────────────────────

export function useGrowthRecommendations(
  teacherId?: string,
  statusFilter: GrowthRecommendationStatus[] = ["active"],
): GrowthRecommendationsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["growth_recommendations", teacherId, statusFilter],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data: rows, error: queryError } = await supabase
        .from("growth_recommendations")
        .select("*")
        .eq("teacher_id", teacherId)
        .in("status", statusFilter)
        .order("priority_score", { ascending: false })
        .limit(20);

      if (queryError) throw new Error(queryError.message);
      return rows ?? [];
    },
    enabled: !!teacherId,
  });

  const recommendations: GrowthRecommendationEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    teacherId: row.teacher_id,
    sourceType: normalizeSourceType(row.source_type),
    sourceTermIds: row.source_term_ids ?? [],
    actionType: normalizeActionType(row.recommended_action_type),
    actionLabel: actionTypeLabel(row.recommended_action_type),
    reason: row.recommendation_reason ?? "",
    recommendedItemId: row.recommended_item_id,
    recommendedItemType: row.recommended_item_type,
    priorityScore: row.priority_score ?? 0,
    status: row.status as GrowthRecommendationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const activeCount = recommendations.filter((r) => r.status === "active").length;
  const completedCount = recommendations.filter((r) => r.status === "completed").length;

  return {
    recommendations,
    activeCount,
    completedCount,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
