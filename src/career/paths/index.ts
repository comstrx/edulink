/**
 * Career Path System — Barrel Export — Sprint 8A
 */

// Types
export type {
  CareerPath,
  CareerStage,
  CareerStageRequirement,
  StageRequirementType,
  RequirementEvaluation,
  StageEvaluationResult,
  CareerStageGapReport,
  TeacherCareerState,
  TeacherCareerGoal,
  TeacherCareerSignals,
  CareerStateTrace,
} from "./career-path.types";

// Engines
export { evaluateRequirement, evaluateStage } from "./career-stage-requirement-engine";
export { evaluateTeacherCareerState, generateStageGapReport } from "./teacher-career-state-evaluator";
export type { CareerPathData } from "./teacher-career-state-evaluator";

// Services
export { refreshCareerState } from "./career-state-refresh.service";
export type { CareerStateRefreshResult } from "./career-state-refresh.service";

// Data loading
export { loadCareerPathData, loadTeacherCareerSignals, persistCareerState } from "./career-signals-loader";

// Hooks
export { useTeacherCareerState } from "./hooks/useTeacherCareerState";
export type { TeacherCareerStateView } from "./hooks/useTeacherCareerState";
