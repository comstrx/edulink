/**
 * School Team Gap Intelligence Types — Sprint 2
 *
 * Aggregated gap patterns across a school's teaching team.
 * Read-only, summary-level — no per-teacher detail exposure.
 */

export interface GapCategoryDistribution {
  /** Humanized category label */
  category: string;
  /** Number of teachers with this gap category */
  count: number;
  /** Percentage of teachers-with-gaps affected */
  percentage: number;
}

export interface SchoolTeamGapIntelligence {
  schoolId: string;
  totalTeachers: number;
  teachersWithGaps: number;
  totalGaps: number;
  gapDistribution: GapCategoryDistribution[];
  /** Highest-frequency gap category */
  topGapCategory: string | null;
  /** Most frequent gap among teachers with readiness_level = "early" */
  criticalGapCategory: string | null;
  computedAt: string;
}
