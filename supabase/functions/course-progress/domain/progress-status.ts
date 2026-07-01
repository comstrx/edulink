/**
 * Course-progress state machine (pure). The single source of truth for which
 * transitions are legal. Unit-tested in `__tests__/progress-status.test.ts`.
 *
 * The `complete` transition is *also* enforced atomically in SQL
 * (`complete_course_progress`); this TS copy exists for fast, typed
 * pre-validation of `start`/`continue` and to document the rules in one place.
 */

import { Errors } from "./errors.ts";

export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type ProgressAction = "start" | "continue" | "complete";

const TRANSITIONS: Record<ProgressAction, { from: ProgressStatus[]; to: ProgressStatus }> = {
  start: { from: ["not_started"], to: "in_progress" },
  continue: { from: ["in_progress"], to: "in_progress" },
  complete: { from: ["in_progress"], to: "completed" },
};

export function canApply(action: ProgressAction, current: ProgressStatus): boolean {
  return TRANSITIONS[action].from.includes(current);
}

/** Returns the resulting status, or throws a typed DomainError explaining why not. */
export function applyAction(action: ProgressAction, current: ProgressStatus): ProgressStatus {
  const rule = TRANSITIONS[action];
  if (rule.from.includes(current)) return rule.to;

  if (action === "complete" && current === "completed") {
    throw Errors.conflict("Course is already completed");
  }
  if (action === "complete" && current === "not_started") {
    throw Errors.invalidState("Cannot complete a course that has not started");
  }
  throw Errors.invalidState(`Cannot ${action} from status "${current}"`);
}
