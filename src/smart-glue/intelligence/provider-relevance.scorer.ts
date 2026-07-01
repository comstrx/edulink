/**
 * Provider Relevance Scorer — Sprint 4.5 Step 2
 *
 * Computes a relevance score per course based on:
 *   1. Gap overlap: how many user gap term IDs match the course's competency tags
 *   2. CRI boost: higher criBoostValue → higher score
 *
 * Pure computation — no ranking, no sorting, no side effects.
 */

import type { ProviderCourseContext } from "./provider-context.reader";

// ── Types ────────────────────────────────────────────────────

export interface GapTermEntry {
  termId: string;
  category: string;
}

export interface CourseRelevanceResult {
  courseId: string;
  providerId: string;
  /** Number of gap term IDs matched by this course */
  gapOverlapCount: number;
  /** Which gap term IDs this course addresses */
  matchedGapTermIds: string[];
  /** Normalized CRI boost contribution (0–1 scale) */
  criBoostContribution: number;
  /** Final relevance score */
  relevanceScore: number;
}

// ── Weights ──────────────────────────────────────────────────

const GAP_OVERLAP_WEIGHT = 10;
const CRI_BOOST_WEIGHT = 5;
const MAX_CRI_BOOST = 20; // cap for normalization

// ── Scorer ───────────────────────────────────────────────────

/**
 * Score a single course against user gaps.
 * Pure, deterministic, no side effects.
 */
export function scoreCourseRelevance(
  course: ProviderCourseContext,
  userGapTermIds: string[],
): CourseRelevanceResult {
  const gapSet = new Set(userGapTermIds);

  // 1. Gap overlap
  const matchedGapTermIds: string[] = [];
  for (const termId of course.competencyTermIds) {
    if (gapSet.has(termId)) {
      matchedGapTermIds.push(termId);
    }
  }
  // Also check subject terms against gaps
  for (const termId of course.subjectTermIds) {
    if (gapSet.has(termId) && !matchedGapTermIds.includes(termId)) {
      matchedGapTermIds.push(termId);
    }
  }

  const gapOverlapCount = matchedGapTermIds.length;

  // 2. CRI boost contribution (normalized 0–1)
  const rawBoost = course.criBoostValue ?? 0;
  const criBoostContribution = Math.min(rawBoost / MAX_CRI_BOOST, 1);

  // 3. Final score
  const relevanceScore =
    gapOverlapCount * GAP_OVERLAP_WEIGHT +
    criBoostContribution * CRI_BOOST_WEIGHT;

  return {
    courseId: course.courseId,
    providerId: course.providerId,
    gapOverlapCount,
    matchedGapTermIds,
    criBoostContribution,
    relevanceScore,
  };
}

/**
 * Score multiple courses against user gaps. No sorting applied.
 */
export function scoreCourses(
  courses: ProviderCourseContext[],
  userGapTermIds: string[],
): CourseRelevanceResult[] {
  return courses.map((c) => scoreCourseRelevance(c, userGapTermIds));
}
