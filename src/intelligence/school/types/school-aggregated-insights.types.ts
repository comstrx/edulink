/**
 * School Aggregated Insights Types — Sprint 10
 *
 * Team-level intelligence combining gaps, weak areas, hiring patterns,
 * and aggregated recommendation insights for data-driven decisions.
 */

// ── Team Weak Areas ────────────────────────────────────────────

export interface TeamWeakArea {
  /** Category key (e.g., "certification_gap") */
  areaKey: string;
  /** Human label */
  label: string;
  /** Number of team members affected */
  affectedCount: number;
  /** Percentage of team affected */
  affectedPercent: number;
  /** Severity: critical if paired with low readiness */
  severity: "critical" | "moderate" | "low";
}

// ── Hiring Patterns ────────────────────────────────────────────

export interface HiringPattern {
  patternKey: string;
  label: string;
  description: string;
  severity: "info" | "warning" | "critical";
}

// ── Aggregated Recommendation Insight ──────────────────────────

export interface TeamRecommendationInsight {
  /** Recommendation action type */
  actionType: string;
  /** Human label */
  label: string;
  /** How many team members have this recommendation */
  teacherCount: number;
  /** Priority: high if many teachers need it */
  priority: "high" | "medium" | "low";
  /** Suggested institutional action */
  institutionalAction: string;
}

// ── School Alert ───────────────────────────────────────────────

export type SchoolAlertSeverity = "critical" | "warning" | "info";
export type SchoolAlertSource = "gaps" | "hiring" | "training" | "team";

export interface SchoolIntelligenceAlert {
  id: string;
  source: SchoolAlertSource;
  severity: SchoolAlertSeverity;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

// ── Combined Output ────────────────────────────────────────────

export interface SchoolAggregatedInsights {
  schoolId: string;
  weakAreas: TeamWeakArea[];
  hiringPatterns: HiringPattern[];
  recommendationInsights: TeamRecommendationInsight[];
  alerts: SchoolIntelligenceAlert[];
  computedAt: string;
}
