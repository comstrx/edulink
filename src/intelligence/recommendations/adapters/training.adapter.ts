/**
 * Training Domain Adapter (Read-Only)
 *
 * Pure interpretation layer for training-domain signals.
 * Reads ONLY from existing UIRecommendation fields — no DB, no services.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

/** Whether the recommendation target is already actively enrolled (in_progress). */
export function isEnrolled(rec: UIRecommendation): boolean {
  return rec.status === "in_progress";
}

/** Whether the recommendation target has been completed. */
export function isCompleted(rec: UIRecommendation): boolean {
  return rec.isCompleted || rec.status === "completed";
}

/** Whether the recommendation is linked to a structured pathway. */
export function isPathwayLinked(rec: UIRecommendation): boolean {
  return !!rec.pathwayContext?.isPathway;
}

/** Whether the actionType represents a course-type recommendation. */
export function isCourseType(rec: UIRecommendation): boolean {
  return (
    rec.actionType === "course_recommendation" ||
    rec.actionType === "enroll_course" ||
    rec.actionType === "complete_missing_course"
  );
}

/** Whether the actionType represents a pathway-type recommendation. */
export function isPathwayType(rec: UIRecommendation): boolean {
  return (
    rec.actionType === "pathway_recommendation" ||
    rec.actionType === "pathway_enrollment"
  );
}

/** Whether the actionType represents a skill-building recommendation. */
export function isSkillBuilding(rec: UIRecommendation): boolean {
  return (
    isCourseType(rec) ||
    isPathwayType(rec) ||
    rec.actionType === "start_pathway" ||
    rec.actionType === "continue_pathway" ||
    rec.actionType === "certification_recommendation" ||
    rec.actionType === "pursue_credential"
  );
}
