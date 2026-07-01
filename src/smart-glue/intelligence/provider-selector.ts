/**
 * Provider Selector — Sprint 4.5 Step 3
 *
 * Selects the single best course for each gap term ID
 * based on relevance score. Pure computation — no UI, no side effects.
 *
 * Tie-breaking: criBoostValue desc → courseId asc (deterministic)
 */

import type { ProviderCourseContext } from "./provider-context.reader";
import { scoreCourseRelevance, type CourseRelevanceResult } from "./provider-relevance.scorer";

// ── Types ────────────────────────────────────────────────────

export interface GapCourseMatch {
  gapTermId: string;
  courseId: string;
  providerId: string;
  relevanceScore: number;
  criBoostValue: number;
}

export interface ProviderSelectionResult {
  /** One best course per gap term ID */
  matches: GapCourseMatch[];
  /** Gap term IDs with no matching course */
  unmatchedGapTermIds: string[];
}

// ── Selector ─────────────────────────────────────────────────

/**
 * For each gap term ID, find the single best course from the catalog.
 * Deterministic: same inputs → same outputs.
 */
export function selectTopCoursePerGap(
  courses: ProviderCourseContext[],
  gapTermIds: string[],
): ProviderSelectionResult {
  if (gapTermIds.length === 0 || courses.length === 0) {
    return { matches: [], unmatchedGapTermIds: [...gapTermIds] };
  }

  // Score every course against all gaps once
  const scored = courses.map((c) => ({
    course: c,
    result: scoreCourseRelevance(c, gapTermIds),
  }));

  const matches: GapCourseMatch[] = [];
  const unmatchedGapTermIds: string[] = [];

  for (const gapTermId of gapTermIds) {
    // Find courses that address this specific gap
    const candidates: { course: ProviderCourseContext; result: CourseRelevanceResult }[] = [];

    for (const s of scored) {
      if (s.result.matchedGapTermIds.includes(gapTermId)) {
        candidates.push(s);
      }
    }

    if (candidates.length === 0) {
      unmatchedGapTermIds.push(gapTermId);
      continue;
    }

    // Sort: relevanceScore desc → criBoostValue desc → courseId asc
    candidates.sort((a, b) => {
      if (b.result.relevanceScore !== a.result.relevanceScore) {
        return b.result.relevanceScore - a.result.relevanceScore;
      }
      const boostA = a.course.criBoostValue ?? 0;
      const boostB = b.course.criBoostValue ?? 0;
      if (boostB !== boostA) return boostB - boostA;
      return a.course.courseId.localeCompare(b.course.courseId);
    });

    const best = candidates[0];
    matches.push({
      gapTermId,
      courseId: best.course.courseId,
      providerId: best.course.providerId,
      relevanceScore: best.result.relevanceScore,
      criBoostValue: best.course.criBoostValue ?? 0,
    });
  }

  return { matches, unmatchedGapTermIds };
}
