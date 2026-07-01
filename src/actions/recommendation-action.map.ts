/**
 * Recommendation Action Map — Sprint 4, Step 2
 *
 * Single source of truth for recommendation type → action mapping.
 * No other file should define recommendation-to-action routing.
 *
 * Rules:
 *  - Every known recommendation type has exactly one entry
 *  - Unknown types resolve to "unsupported_action"
 *  - No duplicate mappings across files
 *  - No fallback guessing
 */

export type RecommendationActionType =
  | "open_course"
  | "open_pathway"
  | "open_profile_edit"
  | "open_job"
  | "open_credentials"
  | "upload_certificate"
  | "book_mentor"
  | "open_training"
  | "unsupported_action";

export interface ActionMapEntry {
  actionType: RecommendationActionType;
  /** Base route when no targetResourceId is available */
  basePath: string;
  /** Build deep-link path when targetResourceId exists */
  deepLinkPattern?: string;
  /** Display label for CTA */
  ctaLabel: string;
}

/**
 * Canonical mapping — one entry per recommendation type.
 * This is the ONLY place action routing is defined.
 */
export const RECOMMENDATION_ACTION_MAP: Record<string, ActionMapEntry> = {
  // Engine-generated recommendation types
  course_recommendation:       { actionType: "open_course",       basePath: "/training",                ctaLabel: "View Course",        deepLinkPattern: "/training/courses/:id" },
  pathway_recommendation:      { actionType: "open_pathway",      basePath: "/training/pathways",       ctaLabel: "View Pathway",       deepLinkPattern: "/training/pathways/:id" },
  certification_recommendation:{ actionType: "upload_certificate", basePath: "/app/teacher/credentials", ctaLabel: "Upload Certificate", deepLinkPattern: "/app/teacher/credentials?highlight=:id" },
  profile_completion_action:   { actionType: "open_profile_edit", basePath: "/app/teacher/profile",     ctaLabel: "Edit Profile",       deepLinkPattern: "/app/teacher/profile?section=:id" },
  verification_action:         { actionType: "open_credentials",  basePath: "/app/teacher/credentials", ctaLabel: "Verify Credential",  deepLinkPattern: "/app/teacher/credentials?verify=:id" },
  curriculum_alignment_action: { actionType: "open_profile_edit", basePath: "/app/teacher/profile",     ctaLabel: "Align Curriculum",   deepLinkPattern: "/app/teacher/profile?section=curriculum" },
  language_improvement_action: { actionType: "open_training",     basePath: "/training",                ctaLabel: "Explore Training" },
  experience_building_action:  { actionType: "open_training",     basePath: "/training",                ctaLabel: "Build Experience" },

  // Adapter-level short types
  training:                    { actionType: "open_course",       basePath: "/training",                ctaLabel: "View Course",        deepLinkPattern: "/training/courses/:id" },
  pathway:                     { actionType: "open_pathway",      basePath: "/training/pathways",       ctaLabel: "View Pathway",       deepLinkPattern: "/training/pathways/:id" },
  job:                         { actionType: "open_job",          basePath: "/jobs",                    ctaLabel: "View Job",           deepLinkPattern: "/jobs/:id" },
  mentor:                      { actionType: "book_mentor",       basePath: "/training/mentors",        ctaLabel: "Book Mentor",        deepLinkPattern: "/training/mentors/:id" },

  // Growth-pipeline canonical action types
  enroll_course:               { actionType: "open_course",       basePath: "/training",                ctaLabel: "View Course",        deepLinkPattern: "/training/courses/:id" },
  complete_missing_course:     { actionType: "open_course",       basePath: "/training",                ctaLabel: "View Course",        deepLinkPattern: "/training/courses/:id" },
  start_pathway:               { actionType: "open_pathway",      basePath: "/training/pathways",       ctaLabel: "Start Pathway",      deepLinkPattern: "/training/pathways/:id" },
  continue_pathway:            { actionType: "open_pathway",      basePath: "/training/pathways",       ctaLabel: "Continue Pathway",   deepLinkPattern: "/training/pathways/:id" },
  pursue_credential:           { actionType: "upload_certificate",basePath: "/app/teacher/credentials", ctaLabel: "Pursue Credential",  deepLinkPattern: "/app/teacher/credentials?highlight=:id" },
  submit_evidence:             { actionType: "open_credentials",  basePath: "/app/teacher/credentials", ctaLabel: "Submit Evidence" },
  revise_evidence:             { actionType: "open_credentials",  basePath: "/app/teacher/credentials", ctaLabel: "Revise Evidence" },
  request_mentor_validation:   { actionType: "book_mentor",       basePath: "/training/mentors",        ctaLabel: "Request Validation", deepLinkPattern: "/training/mentors/:id" },
};

const UNSUPPORTED_ENTRY: ActionMapEntry = {
  actionType: "unsupported_action",
  basePath: "/app/teacher/training/recommendations",
  ctaLabel: "View Details",
};

/**
 * Resolve the action map entry for a recommendation type.
 * Returns explicit unsupported_action for unknown types — no guessing.
 */
export function resolveActionMapEntry(recommendationType: string): ActionMapEntry {
  return RECOMMENDATION_ACTION_MAP[recommendationType] ?? UNSUPPORTED_ENTRY;
}

/**
 * Build the final navigation path, using deep-link if targetResourceId is available.
 */
export function buildActionPath(
  entry: ActionMapEntry,
  targetResourceId?: string,
  pathwayContext?: { isPathway?: boolean; pathwayId?: string },
): string {
  // Pathway-linked training actions → route to teacher's pathways surface
  if (pathwayContext?.isPathway && (entry.actionType === "open_course" || entry.actionType === "open_training")) {
    return "/app/teacher/pathways";
  }

  if (!entry.deepLinkPattern) return entry.basePath;

  // Pattern has no :id placeholder → static deep-link (e.g. ?section=curriculum)
  if (!entry.deepLinkPattern.includes(":id")) return entry.deepLinkPattern;

  // Has :id placeholder but no target → explicit fallback to base
  if (!targetResourceId) return entry.basePath;

  return entry.deepLinkPattern.replace(":id", targetResourceId);
}
