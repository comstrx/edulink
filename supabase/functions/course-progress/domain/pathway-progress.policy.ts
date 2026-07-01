/**
 * Pathway progress policy (pure). Given the required courses, which of them the
 * teacher has completed, and the ordered milestones, decide:
 *   - which milestones unlock / auto-complete,
 *   - the overall progress percent (60% courses + 40% milestones),
 *   - whether the pathway is fully complete.
 *
 * No I/O. The repository loads the inputs and persists the returned decisions.
 * Unit-tested in `__tests__/pathway-progress.policy.test.ts`.
 */

export type MilestoneStatus = "locked" | "available" | "completed";

export interface MilestoneInput {
  id: string;
  status: MilestoneStatus;
  linkedCourseIds: string[];
}

export interface MilestoneUpdate {
  id: string;
  status: MilestoneStatus;
  completedAt: string | null;
}

export interface PathwayProgressInput {
  requiredCourseIds: string[];
  completedCourseIds: ReadonlySet<string>;
  /** Ordered by milestone_order ascending. */
  milestones: MilestoneInput[];
  now: string;
}

export interface PathwayProgressResult {
  milestoneUpdates: MilestoneUpdate[];
  progressPercent: number;
  pathwayComplete: boolean;
}

export function computePathwayProgress(input: PathwayProgressInput): PathwayProgressResult {
  const { requiredCourseIds, completedCourseIds, milestones, now } = input;

  const statuses = milestones.map((m) => m.status);
  const updates: MilestoneUpdate[] = [];

  for (let i = 0; i < milestones.length; i++) {
    if (statuses[i] === "completed") continue;

    if (statuses[i] === "locked") {
      const prevCompleted = i === 0 || statuses[i - 1] === "completed";
      if (prevCompleted) {
        statuses[i] = "available";
        updates.push({ id: milestones[i].id, status: "available", completedAt: null });
      }
    }

    const linked = milestones[i].linkedCourseIds;
    const allLinkedComplete = linked.length > 0 && linked.every((c) => completedCourseIds.has(c));
    if (statuses[i] === "available" && allLinkedComplete) {
      statuses[i] = "completed";
      updates.push({ id: milestones[i].id, status: "completed", completedAt: now });
    }
  }

  const totalMilestones = milestones.length;
  const completedMilestones = statuses.filter((s) => s === "completed").length;
  const required = requiredCourseIds.length;
  const completedCourses = requiredCourseIds.filter((id) => completedCourseIds.has(id)).length;

  let progressPercent = 0;
  if (required > 0 && totalMilestones > 0) {
    const courseP = (completedCourses / required) * 100;
    const milestoneP = (completedMilestones / totalMilestones) * 100;
    progressPercent = Math.round(courseP * 0.6 + milestoneP * 0.4);
  } else if (required > 0) {
    progressPercent = Math.round((completedCourses / required) * 100);
  } else if (totalMilestones > 0) {
    progressPercent = Math.round((completedMilestones / totalMilestones) * 100);
  }

  const allCoursesComplete = required === 0 || completedCourses === required;
  const allMilestonesComplete = totalMilestones === 0 || completedMilestones === totalMilestones;

  return {
    milestoneUpdates: updates,
    progressPercent,
    pathwayComplete: allCoursesComplete && allMilestonesComplete,
  };
}
