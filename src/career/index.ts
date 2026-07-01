/**
 * Career Operating System Layer — Barrel Export
 *
 * Step 10D — Career Operating System Layer
 * Sprint 8A — Career Path System
 */

// Goals
export { createCareerGoal, getAvailableGoalTypes, getGoalDefinition } from "./goals/career-goal.service";
export { CAREER_GOAL_DEFINITIONS } from "./goals/career-goal.types";
export type { CareerGoal, CareerGoalType, CareerGoalStatus, CareerGoalDefinition } from "./goals/career-goal.types";

// Journey
export { buildCareerJourney } from "./journey/career-journey.builder";
export type { JourneyBuilderInputs } from "./journey/career-journey.builder";
export { emptyJourneyPlan } from "./journey/career-journey.types";
export type { CareerJourneyPlan, JourneyStage, CareerMilestone, JourneyNextAction, JourneyRiskArea } from "./journey/career-journey.types";

// Progress
export { calculateCareerProgress } from "./progress/career-progress.service";
export type { CareerProgress, CareerProgressMilestone, CareerProgressInputs } from "./progress/career-progress.service";

// Radar
export { buildOpportunityRadar } from "./radar/opportunity-radar.service";
export type { OpportunityRadarSignal, OpportunityRadarInputs } from "./radar/opportunity-radar.service";

// Career OS Adapter
export { buildCareerExperience } from "./adapters/career-os.adapter";
export type { CareerExperienceSignal, CareerInsight, CareerExperienceInputs } from "./adapters/career-os.adapter";

// Career Path System (Sprint 8A)
export type {
  CareerPath, CareerStage, CareerStageRequirement, TeacherCareerState,
  TeacherCareerGoal, TeacherCareerSignals, CareerStageGapReport,
} from "./paths/career-path.types";
export { evaluateStage, evaluateRequirement } from "./paths/career-stage-requirement-engine";
export { evaluateTeacherCareerState, generateStageGapReport } from "./paths/teacher-career-state-evaluator";
export { refreshCareerState } from "./paths/career-state-refresh.service";
export { useTeacherCareerState } from "./paths/hooks/useTeacherCareerState";
export type { TeacherCareerStateView } from "./paths/hooks/useTeacherCareerState";
