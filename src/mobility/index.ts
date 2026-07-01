/**
 * Career Mobility System — Barrel Export — Sprint 8C
 */

// Types
export type {
  MobilityTrack,
  MobilityTarget,
  MobilityRequirement,
  MobilityRequirementType,
  MobilityRequirementEvaluation,
  MobilityEvaluationResult,
  MobilityGapReport,
  TeacherMobilityState,
  MobilitySignal,
} from "./types/mobility.types";

// Engine
export {
  evaluateMobilityRequirement,
  evaluateMobilityTarget,
  generateMobilityGapReport,
} from "./engine/career-mobility-evaluator";
export type { MobilitySignals } from "./engine/career-mobility-evaluator";
export { loadMobilitySignals, loadMobilityTargetsWithRequirements } from "./engine/mobility-signals-loader";
export { refreshMobilityState } from "./engine/mobility-refresh.service";
export type { MobilityRefreshResult } from "./engine/mobility-refresh.service";
export { buildMobilitySignals } from "./engine/mobility-signals";
export { analyzeMobilityFeedback, executeMobilityFeedback } from "./engine/mobility-feedback.service";
export type { MobilityFeedbackAction, MobilityFeedbackResult } from "./engine/mobility-feedback.service";

// Explainability
export { buildTargetExplainability, buildMobilityExplainabilityBundle } from "./explainability/mobility-explainability.builder";
export type { MobilityTargetExplainability, MobilityExplainabilityBundle } from "./explainability/mobility-explainability.types";

// Hooks
export { useTeacherMobility } from "./hooks/useTeacherMobility";
export type { TeacherMobilityView } from "./hooks/useTeacherMobility";
