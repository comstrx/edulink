/**
 * Taxonomy Governance Utilities
 * 
 * Provides usage-checking and validation for taxonomy terms/domains
 * to prevent accidental data corruption in production.
 * 
 * CORE RULES:
 * - No hard deletes through UI
 * - Deactivation requires usage check
 * - Slugs locked when term is in use
 * - System domain keys are immutable
 * - Hierarchy enforcement for location types only
 */

import { supabase } from "@/integrations/supabase/client";

export interface TermUsageResult {
  isInUse: boolean;
  usageCount: number;
  usedIn: string[]; // e.g. ["teacher_profiles", "jobs"]
}

/**
 * Check if a taxonomy term ID is referenced in teacher_profiles or jobs.
 * Checks both single-value FK columns and array columns.
 */
export async function checkTermUsage(termId: string): Promise<TermUsageResult> {
  const usedIn: string[] = [];
  let usageCount = 0;

  // --- Teacher Profiles ---
  const tpSingleCols = [
    "country_id", "city_id", "region_id", "district_id",
    "nationality_id", "visa_status_term_id", "availability_status_term_id",
  ];
  const tpArrayCols = [
    "subject_ids", "curriculum_ids", "grade_band_ids",
    "certification_ids", "employment_type_term_ids",
    "work_arrangement_term_ids", "availability_status_term_ids",
    "degree_ids", "teaching_license_ids", "curriculum_experience_ids",
    "language_ids",
  ];

  const singleFilters = tpSingleCols.map((col) => `${col}.eq.${termId}`).join(",");
  const { count: tpSingleCount } = await supabase
    .from("teacher_profiles")
    .select("id", { count: "exact", head: true })
    .or(singleFilters);

  if (tpSingleCount && tpSingleCount > 0) {
    usedIn.push("teacher_profiles");
    usageCount += tpSingleCount;
  }

  if (!usedIn.includes("teacher_profiles")) {
    const arrayFilters = tpArrayCols.map((col) => `${col}.cs.{${termId}}`).join(",");
    const { count: tpArrayCount } = await supabase
      .from("teacher_profiles")
      .select("id", { count: "exact", head: true })
      .or(arrayFilters);

    if (tpArrayCount && tpArrayCount > 0) {
      usedIn.push("teacher_profiles");
      usageCount += tpArrayCount;
    }
  }

  // --- Jobs ---
  const jobSingleCols = ["region_term_id", "country_term_id", "city_term_id", "language_level_term_id"];
  const jobArrayCols = [
    "subject_term_ids", "curriculum_term_ids", "grade_band_term_ids",
    "employment_type_term_ids", "work_arrangement_term_ids",
    "visa_status_term_ids", "language_term_ids", "certification_term_ids",
  ];

  const jobSingleFilters = jobSingleCols.map((col) => `${col}.eq.${termId}`).join(",");
  const { count: jobSingleCount } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .or(jobSingleFilters);

  if (jobSingleCount && jobSingleCount > 0) {
    usedIn.push("jobs");
    usageCount += jobSingleCount;
  }

  if (!usedIn.includes("jobs")) {
    const jobArrayFilters = jobArrayCols.map((col) => `${col}.cs.{${termId}}`).join(",");
    const { count: jobArrayCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .or(jobArrayFilters);

    if (jobArrayCount && jobArrayCount > 0) {
      usedIn.push("jobs");
      usageCount += jobArrayCount;
    }
  }

  // --- Training Items ---
  const tiSingleCols = [
    "learning_format_term_id", "training_level_term_id", "credential_type_term_id",
  ];
  const tiArrayCols = [
    "subject_term_ids", "curriculum_term_ids", "grade_band_term_ids",
  ];

  const tiSingleFilters = tiSingleCols.map((col) => `${col}.eq.${termId}`).join(",");
  const { count: tiSingleCount } = await supabase
    .from("training_items")
    .select("id", { count: "exact", head: true })
    .or(tiSingleFilters);

  if (tiSingleCount && tiSingleCount > 0) {
    usedIn.push("training_items");
    usageCount += tiSingleCount;
  }

  if (!usedIn.includes("training_items")) {
    const tiArrayFilters = tiArrayCols.map((col) => `${col}.cs.{${termId}}`).join(",");
    const { count: tiArrayCount } = await supabase
      .from("training_items")
      .select("id", { count: "exact", head: true })
      .or(tiArrayFilters);

    if (tiArrayCount && tiArrayCount > 0) {
      usedIn.push("training_items");
      usageCount += tiArrayCount;
    }
  }

  return { isInUse: usedIn.length > 0, usageCount, usedIn };
}

/**
 * Check if a domain (term_type) has any active terms or terms in use.
 */
export async function checkDomainUsage(termTypeId: string): Promise<{
  activeTermCount: number;
  hasTermsInUse: boolean;
}> {
  const { count: activeTermCount } = await supabase
    .from("taxonomy_terms")
    .select("id", { count: "exact", head: true })
    .eq("term_type_id", termTypeId)
    .eq("is_active", true);

  const { data: terms } = await supabase
    .from("taxonomy_terms")
    .select("id")
    .eq("term_type_id", termTypeId)
    .eq("is_active", true)
    .limit(50);

  let hasTermsInUse = false;
  if (terms && terms.length > 0) {
    for (const term of terms.slice(0, 10)) {
      const usage = await checkTermUsage(term.id);
      if (usage.isInUse) {
        hasTermsInUse = true;
        break;
      }
    }
  }

  return { activeTermCount: activeTermCount ?? 0, hasTermsInUse };
}

/** Core system domain keys that are protected from deletion/key changes */
export const SYSTEM_DOMAIN_KEYS = [
  "regions", "countries", "cities", "districts",
  "curriculums", "subjects", "grade_bands",
  "employment_types", "work_arrangements",
  "languages", "language_levels", "visa_status",
  "certifications", "availability_status",
  "role_families", "rejection_reasons",
  "nationalities", "degrees", "teaching_licenses",
  "skills", "competency_domains", "school_types",
  "learning_formats", "credential_types", "practice_types",
  "evidence_types", "mentor_specializations", "training_levels",
] as const;

/**
 * CUSTOM DOMAIN KEYS
 *
 * Active, non-system domains that are intentionally separate from system domains.
 * These are NOT duplicates or naming errors — they serve distinct business purposes.
 * Excluded from duplicate/system-domain validation warnings.
 *
 * - curriculum_experiences: Hierarchical domain for precise curriculum stage expertise
 *   (e.g. British KS1-A Level, IB PYP/MYP/DP). Stored as curriculum_experience_ids
 *   on teacher_profiles. Distinct from "curriculums" which tracks broad curriculum familiarity.
 */
export const CUSTOM_DOMAIN_KEYS = ["curriculum_experiences"] as const;

/**
 * DEPRECATED DOMAIN KEYS
 * 
 * These domains still exist in taxonomy_term_types for backward compatibility
 * but are NOT the canonical domain for their concept.
 * 
 * - delivery_modes → DEPRECATED. Use "work_arrangements" instead.
 *   Reason: DB columns are work_arrangement_term_ids on both teacher_profiles and jobs.
 *   delivery_modes may still have seeded terms but should NOT appear in user-facing dropdowns.
 * 
 * Any UI loading a deprecated key should log a dev warning and fall back to the canonical domain.
 */
export const DEPRECATED_DOMAIN_KEYS = ["delivery_modes", "certification"] as const;

/** Canonical mapping: deprecated key → canonical key */
export const CANONICAL_DOMAIN_MAP: Record<string, string> = {
  delivery_modes: "work_arrangements",
  certification: "certifications",
};

/**
 * Validate that a new domain key follows the plural canonical naming convention.
 * Returns an error message if the key is invalid, or null if valid.
 *
 * Rules enforced:
 * 1. Must not collide with a deprecated key
 * 2. Must not be a singular variant of an existing system domain
 */
export function validateNewDomainKey(key: string): string | null {
  // Allow known custom domains
  if ((CUSTOM_DOMAIN_KEYS as readonly string[]).includes(key)) {
    return null;
  }

  // Block exact deprecated keys
  if ((DEPRECATED_DOMAIN_KEYS as readonly string[]).includes(key)) {
    const canonical = CANONICAL_DOMAIN_MAP[key];
    return `"${key}" is a deprecated domain. Use "${canonical}" instead.`;
  }

  // Block singular variants of existing plural system domains
  const pluralVariant = key.endsWith("s") ? key : `${key}s`;
  const singularOfExisting = (SYSTEM_DOMAIN_KEYS as readonly string[]).includes(pluralVariant) && pluralVariant !== key;
  if (singularOfExisting) {
    return `"${key}" conflicts with canonical domain "${pluralVariant}". Use the plural form.`;
  }

  return null;
}

/**
 * Get the canonical domain key for a given key.
 * If the key is deprecated, returns the canonical replacement and logs a dev warning.
 * Otherwise returns the original key.
 */
export function getCanonicalDomainKey(domainKey: string): string {
  if (CANONICAL_DOMAIN_MAP[domainKey]) {
    if (import.meta.env.DEV) {
      console.warn(
        `[Taxonomy Governance] Domain key "${domainKey}" is DEPRECATED. ` +
        `Use "${CANONICAL_DOMAIN_MAP[domainKey]}" instead.`
      );
    }
    return CANONICAL_DOMAIN_MAP[domainKey];
  }
  return domainKey;
}

// ─── Language Proficiency Architecture Guidance ───

/**
 * CANONICAL FUTURE ARCHITECTURE — Language Proficiency Modeling
 *
 * The current system stores `language_ids` (uuid[]) on teacher_profiles and
 * `language_term_ids` (uuid[]) on jobs. This captures WHICH languages a teacher
 * speaks or a job requires, but NOT the proficiency level per language.
 *
 * DO NOT model proficiency as:
 *   language_ids[] + a single shared language_level_term_id
 * This is ambiguous (which language does the level apply to?) and unsafe.
 *
 * CANONICAL FUTURE MODEL (when implemented):
 *   Table: teacher_language_proficiencies
 *     - teacher_id          UUID FK → teacher_profiles.id
 *     - language_term_id    UUID FK → taxonomy_terms.id  (domain: languages)
 *     - language_level_term_id UUID FK → taxonomy_terms.id  (domain: language_levels)
 *
 *   Table: job_language_requirements
 *     - job_id              UUID FK → jobs.id
 *     - language_term_id    UUID FK → taxonomy_terms.id  (domain: languages)
 *     - min_level_term_id   UUID FK → taxonomy_terms.id  (domain: language_levels)
 *
 * Until these tables exist, `language_ids` and `language_term_ids` remain the
 * active bindings. Do NOT introduce intermediate workarounds.
 */

// ─── Context Relationship Table Registry ───

/**
 * CONTEXT TABLE REGISTRY
 *
 * These relational tables replace legacy UUID-array columns on base tables.
 * Each table pairs a taxonomy term with contextual metadata (levels, dates, etc.).
 *
 * TEACHER CONTEXT TABLES:
 *   teacher_languages       → language_term_id + language_level_term_id
 *   teacher_skills          → skill_term_id + proficiency_level + years_experience
 *   teacher_certifications  → certification_term_id + issued_by + issue_date + expiry_date
 *   teacher_degrees         → degree_term_id + institution + year_completed
 *   teacher_licenses        → license_term_id + issuing_authority + issue_date + expiry_date
 *
 * JOB CONTEXT TABLES:
 *   job_language_requirements → language_term_id + min_level_term_id + required_or_preferred
 *   job_skill_requirements    → skill_term_id + required_level + required_or_preferred
 *
 * MIGRATION STRATEGY:
 *   1. New tables coexist with legacy array columns (e.g. certification_ids)
 *   2. Hooks use "relational-first, array-fallback" pattern (see useTeacherLanguages)
 *   3. New writes should target relational tables
 *   4. Legacy columns will be deprecated once all reads migrate
 *
 * LEGACY COLUMNS (DO NOT REMOVE — read fallback still active):
 *   teacher_profiles.language_ids       → teacher_languages
 *   teacher_profiles.certification_ids  → teacher_certifications
 *   teacher_profiles.degree_ids         → teacher_degrees
 *   teacher_profiles.teaching_license_ids → teacher_licenses
 */
export const CONTEXT_TABLE_REGISTRY = {
  teacher_languages: { legacyColumn: "language_ids", table: "teacher_profiles" },
  teacher_skills: { legacyColumn: null, table: null },
  teacher_certifications: { legacyColumn: "certification_ids", table: "teacher_profiles" },
  teacher_degrees: { legacyColumn: "degree_ids", table: "teacher_profiles" },
  teacher_licenses: { legacyColumn: "teaching_license_ids", table: "teacher_profiles" },
  job_language_requirements: { legacyColumn: "language_term_ids", table: "jobs" },
  job_skill_requirements: { legacyColumn: null, table: null },
} as const;

/**
 * Validate parent assignment for location hierarchy.
 * Returns error message or null if valid.
 */
export function validateLocationParent(
  termDomainKey: string,
  parentDomainKey: string | undefined
): string | null {
  const VALID_PARENT_MAP: Record<string, string> = {
    countries: "regions",
    cities: "countries",
    districts: "cities",
  };

  if (termDomainKey === "regions") return null;

  const expectedParent = VALID_PARENT_MAP[termDomainKey];
  if (!expectedParent) return null;

  if (parentDomainKey && parentDomainKey !== expectedParent) {
    return `${termDomainKey} can only have a parent from ${expectedParent}, not ${parentDomainKey}.`;
  }

  return null;
}
