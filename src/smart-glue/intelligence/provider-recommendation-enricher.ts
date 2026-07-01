/**
 * Provider-Aware Recommendation Enricher — Sprint 4.5 Step 4
 *
 * Enriches existing training recommendations with provider selection data:
 *   - targetCourseId (best course for the gap)
 *   - providerId
 *   - relevanceScore
 *   - refined reason text
 *
 * Does NOT change recommendation types or add new ones.
 * Does NOT modify the execution handler.
 * Pure computation — engine-centric only.
 */

import type { RecommendationEntry, GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { ProviderCourseContext } from "./provider-context.reader";
import { selectTopCoursePerGap, type GapCourseMatch } from "./provider-selector";
import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";
import type { ExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { buildExplainabilityTrace } from "@/intelligence/observability/explainability.builder";

// ── Types ────────────────────────────────────────────────────

export interface ProviderTarget {
  targetCourseId: string;
  providerId: string;
  relevanceScore: number;
  criBoostValue: number;
  matchedGapTermId: string;
}

export interface EnrichedRecommendation {
  /** Original recommendation — unchanged */
  recommendation: RecommendationEntry;
  /** Provider target if a matching course was found */
  providerTarget: ProviderTarget | null;
  /** Refined reason incorporating provider context */
  refinedReason: string;
  /** Explainability for the provider selection pipeline */
  explainability?: ExplainabilityMeta;
  /** Presentation-safe view (Sprint 5.4) */
  explainabilityView?: ExplainabilityView;
}

// ── Enricher ─────────────────────────────────────────────────

/**
 * Build a refined reason string when provider target is available.
 */
function buildRefinedReason(
  original: RecommendationEntry,
  match: GapCourseMatch | null,
  gapLabel?: string,
): string {
  if (!match) return original.reason ?? "Training recommendation";

  const parts: string[] = [];

  if (gapLabel) {
    parts.push(`Addresses ${gapLabel} gap`);
  } else {
    parts.push("Addresses identified gap");
  }

  if (match.criBoostValue > 0) {
    parts.push(`boosts readiness by ${match.criBoostValue} points`);
  }

  return parts.join(" — ");
}

/**
 * Enrich training recommendations with provider selection data.
 *
 * - Only enriches recommendations of type "training"
 * - Non-training recommendations pass through unchanged
 * - Same input → same output (deterministic)
 */
export function enrichRecommendationsWithProvider(
  recommendations: RecommendationEntry[],
  courses: ProviderCourseContext[],
  gaps: GapEntry[],
): EnrichedRecommendation[] {
  // Collect all gap term IDs from training recommendations
  const allGapTermIds = new Set<string>();
  for (const rec of recommendations) {
    if (rec.type === "training") {
      for (const gapId of rec.addressesGapTermIds) {
        allGapTermIds.add(gapId);
      }
    }
  }

  // Select top course per gap (batch)
  const selection = selectTopCoursePerGap(courses, [...allGapTermIds]);

  // Index matches by gap term ID for fast lookup
  const matchByGap = new Map<string, GapCourseMatch>();
  for (const m of selection.matches) {
    matchByGap.set(m.gapTermId, m);
  }

  // Gap label lookup
  const gapLabelMap = new Map<string, string>();
  for (const g of gaps) {
    if (g.label) gapLabelMap.set(g.termId, g.label);
  }

  return recommendations.map((rec) => {
    if (rec.type !== "training") {
      return {
        recommendation: rec,
        providerTarget: null,
        refinedReason: rec.reason ?? "",
      };
    }

    // Find best match among this recommendation's addressed gaps
    let bestMatch: GapCourseMatch | null = null;
    for (const gapId of rec.addressesGapTermIds) {
      const m = matchByGap.get(gapId);
      if (m && (!bestMatch || m.relevanceScore > bestMatch.relevanceScore)) {
        bestMatch = m;
      }
    }

    const providerTarget: ProviderTarget | null = bestMatch
      ? {
          targetCourseId: bestMatch.courseId,
          providerId: bestMatch.providerId,
          relevanceScore: bestMatch.relevanceScore,
          criBoostValue: bestMatch.criBoostValue,
          matchedGapTermId: bestMatch.gapTermId,
        }
      : null;

    const gapLabel = bestMatch ? gapLabelMap.get(bestMatch.gapTermId) : undefined;

    // Build explainability for this recommendation's provider pipeline
    const stages = [];
    stages.push({ stage: "gap_targeted", reasoning: rec.addressesGapTermIds.map((id) => `gap: ${gapLabelMap.get(id) ?? id}`) });
    if (bestMatch) {
      stages.push({ stage: "scoring", reasoning: [`relevance=${bestMatch.relevanceScore}`, `criBoost=${bestMatch.criBoostValue}`] });
      stages.push({ stage: "selection", reasoning: [`top_match: course=${bestMatch.courseId} provider=${bestMatch.providerId}`] });
    } else {
      stages.push({ stage: "selection", reasoning: ["no matching course found"] });
    }

    return {
      recommendation: rec,
      providerTarget,
      refinedReason: buildRefinedReason(rec, bestMatch, gapLabel),
      explainability: buildExplainabilityTrace({
        traceId: `prov_sel_${Date.now().toString(36)}`,
        stages,
      }),
    };
  });
}
