import { z } from "zod";

/**
 * Package-specific validation schema for training_items where type = 'package'.
 *
 * Phase 5.2 — Package Model Extension
 *
 * Bundled courses use the existing `training_package_items` junction table
 * rather than an array column, for relational integrity.
 *
 * Pricing and targeting fields are added directly to training_items.
 */

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PRICING_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "custom", label: "Custom / Negotiated" },
  { value: "contact_sales", label: "Contact Sales" },
  { value: "included_in_plan", label: "Included in Plan" },
] as const;

export type PricingType = (typeof PRICING_TYPES)[number]["value"];

export const packageFieldsSchema = z.object({
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
  skill_term_ids: z.array(z.string()).default([]),
  competency_domain_term_ids: z.array(z.string()).default([]),
  learning_format_term_id: z.string().nullable().optional(),
  training_level_term_id: z.string().nullable().optional(),
  credential_type_term_id: z.string().nullable().optional(),
  credential_eligible: z.boolean().default(false),
  mentor_supported: z.boolean().default(false),

  // ── Package-specific fields ──

  /**
   * Bundled course IDs — managed via training_package_items junction table.
   * This field is used only in the form layer, not stored on training_items directly.
   */
  bundled_course_ids: z
    .array(z.string().regex(uuidPattern, "Invalid course ID"))
    .default([]),

  /** Commercial pricing mode */
  pricing_type: z
    .enum(["fixed", "custom", "contact_sales", "included_in_plan"])
    .nullable()
    .optional(),

  /** Price amount — required when pricing_type = 'fixed' */
  price_amount: z
    .number()
    .min(0, "Price must be non-negative")
    .nullable()
    .optional(),

  /** ISO currency code */
  price_currency: z.string().max(3).nullable().optional(),

  /** Taxonomy IDs for target audience segments */
  target_segment_term_ids: z
    .array(z.string().regex(uuidPattern, "Invalid taxonomy ID"))
    .default([]),
}).refine(
  (data) => {
    // If pricing_type is 'fixed', price_amount must be set
    if (data.pricing_type === "fixed" && (data.price_amount == null || data.price_amount < 0)) {
      return false;
    }
    return true;
  },
  { message: "Price amount is required for fixed pricing", path: ["price_amount"] },
);

export type PackageFormValues = z.infer<typeof packageFieldsSchema>;

export const emptyPackageForm: PackageFormValues = {
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
  bundled_course_ids: [],
  pricing_type: null,
  price_amount: null,
  price_currency: "USD",
  target_segment_term_ids: [],
};
