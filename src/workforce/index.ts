/**
 * Workforce Intelligence — Barrel Export
 * Sprint 8D + Sprint 4 (explainability)
 */

export type {
  SchoolWorkforceProfile,
  DepartmentCapability,
  WorkforceGap,
  PromotionReadinessEntry,
  TeacherWorkforceSignals,
  WorkforceInsightSummary,
  WorkforceGapSeverity,
  WorkforceGapType,
} from "./types/workforce.types";

export type {
  WorkforceExplainabilityBundle,
  WorkforceProfileExplainability,
  DepartmentExplainability,
  GapExplainability,
  PromotionExplainability,
  WorkforceSignalContribution,
} from "./explainability/workforce-explainability.types";

export {
  aggregateWorkforceProfile,
  aggregateDepartmentCapabilities,
  buildPromotionPipeline,
} from "./engine/workforce-intelligence-aggregator";

export { refreshWorkforceIntelligence } from "./engine/workforce-refresh.service";

export { analyzeWorkforceFeedback, executeWorkforceFeedback } from "./engine/workforce-feedback.service";
export type { WorkforceFeedbackAction, WorkforceFeedbackResult } from "./engine/workforce-feedback.service";

export { buildWorkforceExplainability } from "./explainability/workforce-explainability.builder";

export { useWorkforceIntelligence } from "./hooks/useWorkforceIntelligence";
