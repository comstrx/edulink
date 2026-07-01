/**
 * Career Goal Service
 *
 * In-memory goal management. Goals are lightweight and do NOT
 * trigger engine recomputation.
 *
 * Step 10D — Career Operating System Layer
 */

import type { CareerGoal, CareerGoalType } from "./career-goal.types";
import { CAREER_GOAL_DEFINITIONS } from "./career-goal.types";

let goalCounter = 0;

function generateGoalId(): string {
  goalCounter++;
  return `goal-${Date.now()}-${goalCounter}`;
}

/**
 * Creates a new career goal. Pure factory — no DB, no engine calls.
 */
export function createCareerGoal(
  teacherId: string,
  goalType: CareerGoalType,
  targetTermIds?: string[],
): CareerGoal {
  const definition = CAREER_GOAL_DEFINITIONS[goalType];
  return {
    goalId: generateGoalId(),
    teacherId,
    goalType,
    label: definition.label,
    createdAt: new Date().toISOString(),
    status: "active",
    targetTermIds,
  };
}

/**
 * Returns available goal types with their metadata.
 */
export function getAvailableGoalTypes(): CareerGoalType[] {
  return Object.keys(CAREER_GOAL_DEFINITIONS) as CareerGoalType[];
}

/**
 * Returns the definition for a goal type.
 */
export function getGoalDefinition(goalType: CareerGoalType) {
  return CAREER_GOAL_DEFINITIONS[goalType] ?? null;
}
