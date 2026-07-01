/**
 * Career State Refresh Service — Sprint 8A
 *
 * Orchestrates the full career state recomputation:
 * Load signals → Evaluate → Persist → Emit event
 */

import { loadCareerPathData, loadTeacherCareerSignals, persistCareerState } from "./career-signals-loader";
import { evaluateTeacherCareerState } from "./teacher-career-state-evaluator";
import type { TeacherCareerState } from "./career-path.types";

export interface CareerStateRefreshResult {
  teacherId: string;
  success: boolean;
  states: TeacherCareerState[];
  error?: string;
  completedAt: string;
}

/**
 * Full career state refresh for a teacher.
 * Evaluates all paths and persists the best-fit state.
 */
export async function refreshCareerState(
  teacherId: string,
): Promise<CareerStateRefreshResult> {
  try {
    const [pathsData, signals] = await Promise.all([
      loadCareerPathData(),
      loadTeacherCareerSignals(teacherId),
    ]);

    if (pathsData.length === 0) {
      return {
        teacherId,
        success: true,
        states: [],
        completedAt: new Date().toISOString(),
      };
    }

    // Evaluate all paths
    const allStates = pathsData.map((pd) =>
      evaluateTeacherCareerState(pd, signals),
    );

    // Persist the best-fit: highest current stage order
    const bestState = allStates.reduce((best, current) => {
      if (!best.currentStageId) return current;
      if (!current.currentStageId) return best;
      return current.readinessPercent > best.readinessPercent ? current : best;
    });

    await persistCareerState(bestState);

    console.log(
      `[CareerPath] Refreshed career state for teacher ${teacherId}: ` +
      `stage=${bestState.evaluationTrace.currentStageSlug ?? "none"}, ` +
      `readiness=${bestState.readinessPercent}%`,
    );

    return {
      teacherId,
      success: true,
      states: allStates,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[CareerPath] Refresh failed:", message);
    return {
      teacherId,
      success: false,
      states: [],
      error: message,
      completedAt: new Date().toISOString(),
    };
  }
}
