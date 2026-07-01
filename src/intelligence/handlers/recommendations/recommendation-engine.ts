/**
 * Recommendation Engine (Rule-based V1)
 *
 * Generates training recommendations by matching teacher gaps
 * against the training catalog. Pure computation — no DB writes.
 *
 * Strategy:
 * 1. Collect gap term IDs by category
 * 2. Score each training item by how many gaps it addresses
 * 3. Rank and return top recommendations
 *
 * Phase 3E
 */

import type { RecommendationEntry, GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { RecommendationTeacherData, TeacherGapData, TrainingCatalogItem } from "./recommendation-data-loader";

export interface RecommendationResult {
  recommendations: RecommendationEntry[];
  totalCount: number;
}

const arr = (v: string[] | null | undefined): string[] => v ?? [];

const MAX_RECOMMENDATIONS = 10;

// Category → training item field mapping
const CATEGORY_FIELD_MAP: Record<string, keyof TrainingCatalogItem> = {
  subject: "subject_term_ids",
  curriculum: "curriculum_term_ids",
  skill: "skill_term_ids",
};

/**
 * Score a training item against a set of gap term IDs.
 * Returns the count of gaps this item addresses and which gap IDs.
 */
function scoreTrainingItem(
  item: TrainingCatalogItem,
  gapTermIdsByCategory: Map<string, Set<string>>,
): { score: number; addressedGapIds: string[] } {
  let score = 0;
  const addressedGapIds: string[] = [];

  for (const [category, gapIds] of gapTermIdsByCategory) {
    const fieldKey = CATEGORY_FIELD_MAP[category];
    if (!fieldKey) continue;

    const itemTermIds = arr(item[fieldKey] as string[] | null);
    for (const termId of itemTermIds) {
      if (gapIds.has(termId)) {
        score++;
        addressedGapIds.push(termId);
      }
    }
  }

  // Bonus for credential-eligible items (addresses certification gaps)
  if (item.credential_eligible && gapTermIdsByCategory.has("certification")) {
    score += 1;
  }

  return { score, addressedGapIds };
}

/**
 * Build a reason string from the gap categories addressed.
 */
function buildReason(addressedGapIds: string[], gaps: GapEntry[]): string {
  const gapMap = new Map(gaps.map((g) => [g.termId, g]));
  const categories = new Set<string>();

  for (const id of addressedGapIds) {
    const gap = gapMap.get(id);
    if (gap) categories.add(gap.category);
  }

  if (categories.size === 0) return "Matches your profile interests";

  const labels = Array.from(categories).map((c) =>
    c === "subject" ? "subject" :
    c === "curriculum" ? "curriculum" :
    c === "skill" ? "skill" :
    c === "certification" ? "certification" : c
  );

  return `Addresses ${labels.join(", ")} gap${addressedGapIds.length > 1 ? "s" : ""}`;
}

/**
 * Generate recommendations from gaps + catalog.
 */
export function generateRecommendations(
  teacher: RecommendationTeacherData,
  gapData: TeacherGapData | null,
  catalog: TrainingCatalogItem[],
): RecommendationResult {
  if (catalog.length === 0) {
    return { recommendations: [], totalCount: 0 };
  }

  // Build gap term sets by category
  const gapTermIdsByCategory = new Map<string, Set<string>>();
  const allGaps = gapData?.gaps ?? [];

  for (const gap of allGaps) {
    if (!gap.termId.startsWith("__gap_")) {
      // Only real taxonomy term IDs, not synthetic profile gap markers
      if (!gapTermIdsByCategory.has(gap.category)) {
        gapTermIdsByCategory.set(gap.category, new Set());
      }
      gapTermIdsByCategory.get(gap.category)!.add(gap.termId);
    }
  }

  // Also add teacher's own interests as weak signals for fallback
  const teacherSubjects = new Set(arr(teacher.subject_ids));
  const teacherCurriculums = new Set(arr(teacher.curriculum_ids));

  // Score each catalog item
  const scored: {
    item: TrainingCatalogItem;
    gapScore: number;
    relevanceScore: number;
    addressedGapIds: string[];
  }[] = [];

  for (const item of catalog) {
    const { score: gapScore, addressedGapIds } = scoreTrainingItem(item, gapTermIdsByCategory);

    // Relevance score: how well does this item match teacher's existing profile
    let relevanceScore = 0;
    for (const id of arr(item.subject_term_ids)) {
      if (teacherSubjects.has(id)) relevanceScore++;
    }
    for (const id of arr(item.curriculum_term_ids)) {
      if (teacherCurriculums.has(id)) relevanceScore++;
    }

    if (gapScore > 0 || relevanceScore > 0) {
      scored.push({ item, gapScore, relevanceScore, addressedGapIds });
    }
  }

  // Sort: gap-addressing items first, then by relevance
  scored.sort((a, b) => {
    if (b.gapScore !== a.gapScore) return b.gapScore - a.gapScore;
    return b.relevanceScore - a.relevanceScore;
  });

  // Take top N
  const top = scored.slice(0, MAX_RECOMMENDATIONS);

  const recommendations: RecommendationEntry[] = top.map((entry, idx) => ({
    recommendationId: `legacy-rec-${idx + 1}`,
    recommendationType: "course_recommendation",
    type: "training" as const,
    itemId: entry.item.id,
    priority: "medium" as const,
    confidence: "medium" as const,
    reason: entry.gapScore > 0
      ? buildReason(entry.addressedGapIds, allGaps)
      : "Matches your profile interests",
    reasonCodes: entry.gapScore > 0 ? ["addresses_gaps"] : ["profile_match"],
    actionLabelKey: "course_recommendation",
    groupKey: "training_actions",
    rank: idx + 1,
    addressesGapTermIds: entry.addressedGapIds.length > 0 ? entry.addressedGapIds : [],
    relatedTaxonomyTermIds: [],
  }));

  return {
    recommendations,
    totalCount: recommendations.length,
  };
}
