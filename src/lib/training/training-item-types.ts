/**
 * Strongly-typed application-layer interfaces for Training Items.
 *
 * These supplement the auto-generated Supabase types (which use `Json` for JSONB)
 * with explicit, narrow types for pathway milestones and reflection prompts.
 *
 * Phase 5.3 — Type System Extension
 */

// ── Pathway JSONB structures ──

/** A single milestone in a pathway's journey structure. Design metadata only. */
export interface PathwayMilestone {
  id: string;
  title: string;
  description: string | null;
  order: number;
  linked_course_ids: string[];
}

/** A single reflection prompt in a pathway. Design metadata only. */
export interface PathwayReflectionPrompt {
  id: string;
  prompt: string;
  stage_id: string | null;
  order: number;
}

// ── Training item type discriminator ──

export type TrainingItemType = "course" | "package" | "pathway" | "library" | "resource" | "guide" | "template" | "toolkit";

// ── Shared base fields (present on all item types) ──

export interface TrainingItemBase {
  id: string;
  slug: string;
  title: string;
  type: TrainingItemType;
  status: "draft" | "published" | "archived";
  is_active: boolean;
  description: string | null;
  short_description: string | null;
  overview: string | null;
  duration: string | null;
  audience: string | null;
  outcomes: string[] | null;
  syllabus: string[] | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Shared taxonomy
  subject_term_ids: string[] | null;
  curriculum_term_ids: string[] | null;
  grade_band_term_ids: string[] | null;
  skill_term_ids: string[] | null;
  competency_domain_term_ids: string[] | null;
  learning_format_term_id: string | null;
  training_level_term_id: string | null;
  credential_type_term_id: string | null;
  credential_eligible: boolean;
  mentor_supported: boolean;
}

// ── Course-specific view ──

export interface TrainingCourseItem extends TrainingItemBase {
  type: "course";
  duration_hours: number | null;
  micro_assessment: boolean;
  cri_boost_value: number | null;
}

// ── Package-specific view ──

export interface TrainingPackageItem extends TrainingItemBase {
  type: "package";
  pricing_type: string | null;
  price_amount: number | null;
  price_currency: string | null;
  target_segment_term_ids: string[] | null;
}

// ── Pathway-specific view ──

export interface TrainingPathwayItem extends TrainingItemBase {
  type: "pathway";
  required_course_ids: string[];
  cri_target: number | null;
  milestones: PathwayMilestone[];
  reflection_prompts: PathwayReflectionPrompt[];
}

// ── Union type for discriminated access ──

export type TrainingItem = TrainingCourseItem | TrainingPackageItem | TrainingPathwayItem;

// ── Mappers: convert raw Supabase row → typed application object ──

/**
 * Parse a raw Supabase training_items row into a strongly-typed pathway view.
 * Safely coerces JSONB fields from `Json` to their structured types.
 */
export function parsePathwayFields(row: Record<string, unknown>): {
  required_course_ids: string[];
  cri_target: number | null;
  milestones: PathwayMilestone[];
  reflection_prompts: PathwayReflectionPrompt[];
} {
  const rawMilestones = row.milestones_json;
  const rawPrompts = row.reflection_prompts_json;

  return {
    required_course_ids: Array.isArray(row.required_course_ids)
      ? (row.required_course_ids as string[])
      : [],
    cri_target: typeof row.cri_target === "number" ? row.cri_target : null,
    milestones: Array.isArray(rawMilestones)
      ? (rawMilestones as PathwayMilestone[])
      : [],
    reflection_prompts: Array.isArray(rawPrompts)
      ? (rawPrompts as PathwayReflectionPrompt[])
      : [],
  };
}

/**
 * Serialize pathway form values back to the DB payload shape.
 * Converts form-layer field names to DB column names.
 */
export function serializePathwayPayload(values: {
  required_course_ids: string[];
  cri_target: number | null;
  milestones: PathwayMilestone[];
  reflection_prompts: PathwayReflectionPrompt[];
}): Record<string, unknown> {
  return {
    required_course_ids: values.required_course_ids,
    cri_target: values.cri_target,
    milestones_json: values.milestones,
    reflection_prompts_json: values.reflection_prompts,
  };
}
