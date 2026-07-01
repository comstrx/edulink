/**
 * Career Goal Types
 *
 * Lightweight goal definitions that reference taxonomy values.
 * Goals do NOT trigger engine recomputation.
 *
 * Step 10D — Career Operating System Layer
 */

// ── Goal Types ─────────────────────────────────────────────────

export type CareerGoalType =
  | "work_in_gulf_schools"
  | "teach_british_curriculum"
  | "teach_ib_curriculum"
  | "become_senior_teacher"
  | "move_to_international_school"
  | "improve_career_readiness"
  | "complete_certifications"
  | "expand_subject_range";

export type CareerGoalStatus = "active" | "paused" | "completed" | "abandoned";

export interface CareerGoal {
  goalId: string;
  teacherId: string;
  goalType: CareerGoalType;
  label: string;
  createdAt: string;
  status: CareerGoalStatus;
  /** Optional taxonomy term IDs this goal targets */
  targetTermIds?: string[];
}

// ── Goal Metadata ──────────────────────────────────────────────

export interface CareerGoalDefinition {
  goalType: CareerGoalType;
  label: string;
  description: string;
  /** Taxonomy domains relevant to this goal */
  relevantDomains: string[];
  /** Dimensions that matter most for this goal */
  keyDimensions: string[];
}

export const CAREER_GOAL_DEFINITIONS: Record<CareerGoalType, CareerGoalDefinition> = {
  work_in_gulf_schools: {
    goalType: "work_in_gulf_schools",
    label: "Work in Gulf Schools",
    description: "Prepare for teaching positions in GCC countries",
    relevantDomains: ["countries", "school_types", "certifications"],
    keyDimensions: ["location", "certification", "experience"],
  },
  teach_british_curriculum: {
    goalType: "teach_british_curriculum",
    label: "Teach British Curriculum",
    description: "Qualify to teach in British curriculum schools",
    relevantDomains: ["curriculums", "certifications", "subjects"],
    keyDimensions: ["curriculum", "certification", "subjects"],
  },
  teach_ib_curriculum: {
    goalType: "teach_ib_curriculum",
    label: "Teach IB Curriculum",
    description: "Qualify to teach International Baccalaureate",
    relevantDomains: ["curriculums", "certifications", "subjects"],
    keyDimensions: ["curriculum", "certification", "training"],
  },
  become_senior_teacher: {
    goalType: "become_senior_teacher",
    label: "Become Senior Teacher",
    description: "Progress to senior teaching roles",
    relevantDomains: ["seniority_levels", "certifications"],
    keyDimensions: ["experience", "certification", "training"],
  },
  move_to_international_school: {
    goalType: "move_to_international_school",
    label: "Move to International School",
    description: "Transition to international school teaching",
    relevantDomains: ["school_types", "curriculums", "languages"],
    keyDimensions: ["certification", "language", "experience"],
  },
  improve_career_readiness: {
    goalType: "improve_career_readiness",
    label: "Improve Career Readiness",
    description: "Strengthen overall professional profile",
    relevantDomains: ["certifications", "skills"],
    keyDimensions: ["profile", "training", "verification"],
  },
  complete_certifications: {
    goalType: "complete_certifications",
    label: "Complete Certifications",
    description: "Earn missing professional certifications",
    relevantDomains: ["certifications", "licenses"],
    keyDimensions: ["certification", "verification"],
  },
  expand_subject_range: {
    goalType: "expand_subject_range",
    label: "Expand Subject Range",
    description: "Add new teaching subjects to your profile",
    relevantDomains: ["subjects", "curriculums"],
    keyDimensions: ["subjects", "training"],
  },
};
