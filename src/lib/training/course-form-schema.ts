import { z } from "zod";

/**
 * Course-specific validation schema for training_items where type = 'course'.
 *
 * Phase 5.1 — Course Model Extension
 *
 * Field mapping to existing training_items columns:
 *   duration_hours       → duration_hours (integer, nullable)
 *   competency_tag_ids   → skill_term_ids + competency_domain_term_ids (uuid[], nullable)
 *   certification_awarded → credential_eligible (boolean, default false)
 *   micro_assessment     → micro_assessment (boolean, default false)
 *   cri_boost_value      → cri_boost_value (smallint, nullable)
 */

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const courseFieldsSchema = z.object({
  // ── Core fields (all item types) ──
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  description: z.string().nullable().optional(),
  short_description: z.string().max(300).nullable().optional(),
  overview: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  outcomes: z.array(z.string()).nullable().optional(),
  syllabus: z.array(z.string()).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),

  // ── Course-specific fields ──

  /** Estimated total learning hours. Must be >= 1 if provided. */
  duration_hours: z
    .number()
    .int("Must be a whole number")
    .min(1, "Duration must be at least 1 hour")
    .nullable()
    .optional(),

  /**
   * Skill taxonomy term IDs mapped to this course.
   * All IDs must be valid UUIDs from the skills domain.
   */
  skill_term_ids: z
    .array(z.string().regex(uuidPattern, "Invalid taxonomy ID"))
    .default([]),

  /**
   * Competency domain taxonomy term IDs mapped to this course.
   * All IDs must be valid UUIDs from the competency_domains domain.
   */
  competency_domain_term_ids: z
    .array(z.string().regex(uuidPattern, "Invalid taxonomy ID"))
    .default([]),

  /**
   * Whether completing this course results in a credential artifact.
   * Maps to: credential_eligible
   */
  credential_eligible: z.boolean().default(false),

  /**
   * Whether this course includes an embedded micro assessment component.
   * This is metadata only — no user attempt/score system in this phase.
   */
  micro_assessment: z.boolean().default(false),

  /**
   * Fixed CRI contribution potential weight (0–100).
   * Static course metadata, not a user score.
   * Maps to: cri_boost_value (smallint)
   */
  cri_boost_value: z
    .number()
    .int("Must be a whole number")
    .min(0, "CRI boost must be non-negative")
    .max(100, "CRI boost must not exceed 100")
    .nullable()
    .optional(),

  // ── Taxonomy filters ──
  subject_term_ids: z.array(z.string()).default([]),
  curriculum_term_ids: z.array(z.string()).default([]),
  grade_band_term_ids: z.array(z.string()).default([]),
  learning_format_term_id: z.string().nullable().optional(),
  training_level_term_id: z.string().nullable().optional(),
  credential_type_term_id: z.string().nullable().optional(),
  mentor_supported: z.boolean().default(false),
});

export type CourseFormValues = z.infer<typeof courseFieldsSchema>;

/**
 * Default values for a new Course item.
 */
export const emptyCourseForm: CourseFormValues = {
  title: "",
  slug: "",
  description: null,
  short_description: null,
  overview: null,
  duration: null,
  audience: null,
  outcomes: [],
  syllabus: [],
  status: "draft",
  duration_hours: null,
  skill_term_ids: [],
  competency_domain_term_ids: [],
  credential_eligible: false,
  micro_assessment: false,
  cri_boost_value: null,
  subject_term_ids: [],
  curriculum_term_ids: [],
  grade_band_term_ids: [],
  learning_format_term_id: null,
  training_level_term_id: null,
  credential_type_term_id: null,
  mentor_supported: false,
};
