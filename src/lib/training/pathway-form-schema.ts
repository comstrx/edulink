import { z } from "zod";

/**
 * Pathway-specific validation schema for training_items where type = 'pathway'.
 *
 * Phase 5.3 — Pathway Model Extension
 *
 * Field mapping to existing training_items columns:
 *   target_competency_ids → skill_term_ids + competency_domain_term_ids (uuid[], reused)
 *   required_course_ids   → required_course_ids (uuid[], new column)
 *   cri_target_value      → cri_target (numeric, existing column)
 *   milestones            → milestones_json (jsonb, new column)
 *   reflection_prompts    → reflection_prompts_json (jsonb, new column)
 */

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Milestone schema ──

export const milestoneSchema = z.object({
  id: z.string().min(1, "Milestone ID is required"),
  title: z.string().min(1, "Milestone title is required"),
  description: z.string().nullable().optional(),
  order: z.number().int().min(1, "Order must be positive"),
  linked_course_ids: z
    .array(z.string().regex(uuidPattern, "Invalid course ID"))
    .default([]),
}).strict();

export type MilestoneEntry = z.infer<typeof milestoneSchema>;

// ── Reflection prompt schema ──

export const reflectionPromptSchema = z.object({
  id: z.string().min(1, "Prompt ID is required"),
  prompt: z.string().min(1, "Prompt text is required"),
  stage_id: z.string().nullable().optional(),
  order: z.number().int().min(1, "Order must be positive"),
}).strict();

export type ReflectionPromptEntry = z.infer<typeof reflectionPromptSchema>;

// ── Full pathway form schema ──

export const pathwayFieldsSchema = z.object({
  // ── Core fields (shared with all item types) ──
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

  // ── Taxonomy filters (shared) ──
  subject_term_ids: z.array(z.string()).default([]),
  curriculum_term_ids: z.array(z.string()).default([]),
  grade_band_term_ids: z.array(z.string()).default([]),
  learning_format_term_id: z.string().nullable().optional(),
  training_level_term_id: z.string().nullable().optional(),
  credential_type_term_id: z.string().nullable().optional(),
  credential_eligible: z.boolean().default(false),
  mentor_supported: z.boolean().default(false),

  // ── Pathway-specific fields ──

  /**
   * Target competency taxonomy IDs (skills domain).
   * Reuses the existing skill_term_ids column.
   */
  skill_term_ids: z
    .array(z.string().regex(uuidPattern, "Invalid taxonomy ID"))
    .default([]),

  /**
   * Target competency taxonomy IDs (competency_domains domain).
   * Reuses the existing competency_domain_term_ids column.
   */
  competency_domain_term_ids: z
    .array(z.string().regex(uuidPattern, "Invalid taxonomy ID"))
    .default([]),

  /**
   * Required course IDs that constitute the pathway journey.
   * All must reference training_items with type = 'course'.
   */
  required_course_ids: z
    .array(z.string().regex(uuidPattern, "Invalid course ID"))
    .default([]),

  /**
   * CRI readiness target value for this pathway.
   * Maps to existing cri_target column.
   */
  cri_target: z
    .number()
    .min(0, "CRI target must be non-negative")
    .max(999.99, "CRI target exceeds maximum")
    .nullable()
    .optional(),

  /** Structured milestone definitions */
  milestones: z.array(milestoneSchema).default([]),

  /** Structured reflection prompt definitions */
  reflection_prompts: z.array(reflectionPromptSchema).default([]),
}).superRefine((data, ctx) => {
  // ── Duplicate checks on UUID arrays ──
  const checkDuplicates = (arr: string[], fieldPath: string) => {
    if (new Set(arr).size !== arr.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate IDs are not allowed",
        path: [fieldPath],
      });
    }
  };

  checkDuplicates(data.required_course_ids, "required_course_ids");
  checkDuplicates(data.skill_term_ids, "skill_term_ids");
  checkDuplicates(data.competency_domain_term_ids, "competency_domain_term_ids");

  // ── Milestone validations ──
  const requiredSet = new Set(data.required_course_ids);

  // Milestone linked_course_ids must be subset of required_course_ids
  data.milestones.forEach((m, mi) => {
    m.linked_course_ids.forEach((cid, ci) => {
      if (!requiredSet.has(cid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Linked course must be in the required courses list",
          path: ["milestones", mi, "linked_course_ids", ci],
        });
      }
    });
  });

  // Milestone IDs must be unique
  const milestoneIds = data.milestones.map((m) => m.id);
  if (new Set(milestoneIds).size !== milestoneIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Milestone IDs must be unique",
      path: ["milestones"],
    });
  }

  // ── Reflection prompt validations ──
  const milestoneIdSet = new Set(milestoneIds);

  // stage_id must reference existing milestone
  data.reflection_prompts.forEach((rp, ri) => {
    if (rp.stage_id && !milestoneIdSet.has(rp.stage_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stage must reference an existing milestone",
        path: ["reflection_prompts", ri, "stage_id"],
      });
    }
  });

  // Reflection prompt IDs must be unique
  const promptIds = data.reflection_prompts.map((rp) => rp.id);
  if (new Set(promptIds).size !== promptIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reflection prompt IDs must be unique",
      path: ["reflection_prompts"],
    });
  }
});

export type PathwayFormValues = z.infer<typeof pathwayFieldsSchema>;

export const emptyPathwayForm: PathwayFormValues = {
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
  subject_term_ids: [],
  curriculum_term_ids: [],
  grade_band_term_ids: [],
  skill_term_ids: [],
  competency_domain_term_ids: [],
  learning_format_term_id: null,
  training_level_term_id: null,
  credential_type_term_id: null,
  credential_eligible: false,
  mentor_supported: false,
  required_course_ids: [],
  cri_target: null,
  milestones: [],
  reflection_prompts: [],
};
