/**
 * School Intelligence — Public API
 *
 * Sprint 13 PART 2 + PART 4 + Sprint 10: Canonical exports for school-facing intelligence.
 * Single import path — no competing definitions allowed.
 */

// Types
export type {
  SchoolHiringIntelligence,
  SchoolTeamIntelligence,
  MatchHealthDistribution,
  ReadinessDistribution,
  VerifiedCandidatesSummary,
  TopFitCandidate,
  DepartmentSummaryEntry,
  PromotionReadinessSummary,
  TrainingReadinessSummary,
  VerifiedStaffSummary,
} from "./types/school-intelligence.types";

export type {
  SchoolAggregatedInsights,
  TeamWeakArea,
  HiringPattern,
  TeamRecommendationInsight,
  SchoolIntelligenceAlert,
  SchoolAlertSeverity,
  SchoolAlertSource,
} from "./types/school-aggregated-insights.types";

// Hook result types (lifecycle contract)
export type {
  SchoolHiringResolvedState,
  SchoolHiringIntelligenceResult,
} from "./hooks/useSchoolHiringIntelligence";
export type {
  SchoolTeamResolvedState,
  SchoolTeamIntelligenceResult,
} from "./hooks/useSchoolTeamIntelligence";
export type {
  AggregatedInsightsResolvedState,
  SchoolAggregatedInsightsResult,
} from "./hooks/useSchoolAggregatedInsights";

// Hooks (canonical consumption path)
export { useSchoolHiringIntelligence } from "./hooks/useSchoolHiringIntelligence";
export { useSchoolTeamIntelligence } from "./hooks/useSchoolTeamIntelligence";
export { useSchoolAggregatedInsights } from "./hooks/useSchoolAggregatedInsights";

// Readers (for Smart Glue handlers / server-side use only)
export { resolveSchoolHiringIntelligence } from "./readers/school-hiring-intelligence.reader";
export { resolveSchoolTeamIntelligence } from "./readers/school-team-intelligence.reader";
export { resolveSchoolAggregatedInsights } from "./readers/school-aggregated-insights.reader";
