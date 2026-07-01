/**
 * Provider Signals Service — Sprint 14 PART 2
 *
 * Derives provider-level performance signals from existing
 * intelligence layer data. NOT a separate analytics system.
 *
 * Signals are computed on-demand and cached in-memory.
 * Updated via Smart Glue reactions — never by UI components.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  type ProviderPerformanceSummary,
  computeProviderEffectiveness,
} from "./provider-performance.types";

// ── In-Memory Cache (per-session) ──────────────────────────────

const summaryCache = new Map<string, { summary: ProviderPerformanceSummary; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get or compute provider performance summary.
 * Derived from training_completions + intelligence gap snapshots.
 */
export async function getProviderPerformanceSummary(
  providerId: string,
): Promise<ProviderPerformanceSummary> {
  // Check cache
  const cached = summaryCache.get(providerId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.summary;
  }

  const summary = await computeProviderSummary(providerId);
  summaryCache.set(providerId, { summary, cachedAt: Date.now() });
  return summary;
}

/**
 * Invalidate cached summary for a provider (called after updates).
 */
export function invalidateProviderSummary(providerId: string): void {
  summaryCache.delete(providerId);
}

/**
 * Compute provider summary from existing data.
 *
 * Strategy:
 *   1. Find all training_items owned by this provider
 *   2. Count completions for those items
 *   3. Count verified completions
 *   4. Estimate gap closures from completion count + verified ratio
 */
async function computeProviderSummary(
  providerId: string,
): Promise<ProviderPerformanceSummary> {
  try {
    // Step 1: Get provider's training item IDs
    const { data: items } = await supabase
      .from("training_items")
      .select("id")
      .eq("provider_id", providerId)
      .eq("is_active", true)
      .limit(500);

    const itemIds = (items ?? []).map((i) => i.id);

    if (itemIds.length === 0) {
      return emptyProviderSummary(providerId);
    }

    // Step 2: Count completions for those items
    const { data: completions } = await supabase
      .from("training_completions")
      .select("id, verified_completion, source_id")
      .in("source_id", itemIds);

    const allCompletions = completions ?? [];
    const completionCount = allCompletions.length;
    const verifiedCompletionCount = allCompletions.filter((c) => c.verified_completion).length;

    // Step 3: Estimate gap closures
    // Use verified ratio as proxy for gap closure effectiveness
    // (verified completions indicate practice-validated learning)
    const gapClosureCount = Math.round(verifiedCompletionCount * 0.8 + (completionCount - verifiedCompletionCount) * 0.2);

    const { score, band } = computeProviderEffectiveness(
      completionCount,
      gapClosureCount,
      verifiedCompletionCount,
    );

    return {
      providerId,
      completionCount,
      gapClosureCount,
      verifiedCompletionCount,
      effectivenessScore: score,
      effectivenessBand: band,
      lastUpdatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[ProviderSignals] Failed to compute summary for ${providerId}:`, err);
    return emptyProviderSummary(providerId);
  }
}

function emptyProviderSummary(providerId: string): ProviderPerformanceSummary {
  return {
    providerId,
    completionCount: 0,
    gapClosureCount: 0,
    verifiedCompletionCount: 0,
    effectivenessScore: 0,
    effectivenessBand: "unknown",
    lastUpdatedAt: new Date().toISOString(),
  };
}
