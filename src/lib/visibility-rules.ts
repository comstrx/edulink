/**
 * Visibility Rules — Centralized public-exposure predicates & constants
 *
 * This file is the SINGLE SOURCE OF TRUTH for:
 * 1. Allowed visibility enum values (shared between DB validation & TS)
 * 2. Default visibility settings
 * 3. Query-level filter functions for each entity type
 *
 * Public-facing queries MUST use apply*PublicFilters() functions.
 * UI hooks (useEffectiveVisibility) compose on top for the current user.
 *
 * Sprint 8 — Visibility + Trust Normalization
 */

// ── Visibility Enum ─────────────────────────────────────────────────

/**
 * Canonical visibility levels, ordered from most restrictive to least.
 * Must match the allowed values in validate_visibility_setting() trigger.
 */
export const VISIBILITY_LEVELS = ["private", "members_only", "schools_only", "public"] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

/** Runtime check — returns true if the value is a valid VisibilityLevel */
export function isValidVisibilityLevel(value: unknown): value is VisibilityLevel {
  return typeof value === "string" && (VISIBILITY_LEVELS as readonly string[]).includes(value);
}

// ── Default Visibility Settings ─────────────────────────────────────

/**
 * Conservative defaults — used when no row exists in account_visibility_settings.
 * Matches the DB column defaults exactly.
 */
export const DEFAULT_VISIBILITY_SETTINGS = {
  profile_visibility: "members_only" as VisibilityLevel,
  photo_visibility: "members_only" as VisibilityLevel,
  contact_visibility: "private" as VisibilityLevel,
  credentials_visibility: "members_only" as VisibilityLevel,
  activity_visibility: "private" as VisibilityLevel,
} as const;

// ── Verification Types ──────────────────────────────────────────────

/**
 * Canonical verification types — must match validate_account_verification() trigger.
 */
export const VERIFICATION_TYPES = [
  "email",
  "phone",
  "teacher_identity",
  "mentor_review",
  "provider_review",
  "school_review",
  "credential_verification",
] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected", "expired"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

// ── Safe Public Column Lists ────────────────────────────────────────

/**
 * Columns safe to return on public teacher directory/search queries.
 * Excludes: cv_url, user_id, email, phone, and other PII.
 */
export const TEACHER_PUBLIC_COLUMNS = "id, full_name, avatar_url, bio, city, country, years_of_experience, availability_status, subject_ids, curriculum_ids, certification_ids, grade_band_ids, language_ids, nationality_id, country_id, city_id, region_id, opportunity_type_ids, is_public_profile, is_featured, preferred_start, visa_status_term_id, availability_status_term_id, student_age_range, profile_source, created_at, updated_at" as const;

/**
 * Extended columns for teacher profile page (viewed by authenticated users).
 * Includes curriculum_experience_ids, education, experience, teaching_demo etc.
 * Still excludes raw user_id for non-owners.
 */
export const TEACHER_PROFILE_PUBLIC_COLUMNS = "id, full_name, avatar_url, bio, city, country, years_of_experience, availability_status, subject_ids, curriculum_ids, certification_ids, grade_band_ids, language_ids, teaching_license_ids, degree_ids, curriculum_experience_ids, nationality_id, country_id, city_id, region_id, opportunity_type_ids, experience, education, teaching_demo, completed_training, is_public_profile, is_featured, preferred_start, visa_status, visa_status_term_id, availability_status_term_id, student_age_range, profile_source, created_at, updated_at" as const;

/**
 * Full columns including user_id and cv_url — ONLY for profile owner view.
 */
export const TEACHER_OWNER_COLUMNS = "id, user_id, full_name, avatar_url, bio, city, country, years_of_experience, availability_status, subject_ids, curriculum_ids, certification_ids, grade_band_ids, language_ids, teaching_license_ids, degree_ids, curriculum_experience_ids, nationality_id, country_id, city_id, region_id, opportunity_type_ids, experience, education, teaching_demo, completed_training, is_public_profile, is_featured, preferred_start, cv_url, visa_status, visa_status_term_id, availability_status_term_id, student_age_range, profile_source, created_at, updated_at" as const;

// ── Teacher ─────────────────────────────────────────────────────────

/**
 * A teacher is publicly discoverable when:
 * 1. is_public_profile = true  (teacher opted in)
 * 2. profile_source = 'auth'   (not a demo/seed record)
 *
 * Supabase query filters to apply:
 *   .eq("is_public_profile", true)
 *   .eq("profile_source", "auth")
 */
export interface TeacherPublicFilters {
  is_public_profile: true;
  profile_source: "auth";
}

export const TEACHER_PUBLIC_FILTERS: TeacherPublicFilters = {
  is_public_profile: true,
  profile_source: "auth",
};

/**
 * Apply canonical teacher public visibility filters to a Supabase query.
 * Callers can pass additional filters on top.
 */
export function applyTeacherPublicFilters<Q extends { eq: Function; not: Function }>(query: Q): Q {
  return query
    .eq("is_public_profile", true)
    .eq("profile_source", "auth") as Q;
}

// ── Mentor ──────────────────────────────────────────────────────────

/**
 * A mentor is publicly discoverable when:
 * 1. status = 'active'           (admin-approved lifecycle)
 * 2. onboarding_completed_at IS NOT NULL  (setup finished)
 *
 * Supabase query filters:
 *   .eq("status", "active")
 *   .not("onboarding_completed_at", "is", null)
 */
export function applyMentorPublicFilters<Q extends { eq: Function; not: Function }>(query: Q): Q {
  return query
    .eq("status", "active")
    .not("onboarding_completed_at", "is", null) as Q;
}

// ── Provider ────────────────────────────────────────────────────────

/**
 * A provider is publicly discoverable when:
 * 1. status = 'active'  (approved lifecycle)
 *
 * verification_status is a trust signal, NOT a visibility gate.
 * Unverified but active providers are still listed (with no badge).
 *
 * Supabase query filters:
 *   .eq("status", "active")
 */
export function applyProviderPublicFilters<Q extends { eq: Function }>(query: Q): Q {
  return query.eq("status", "active") as Q;
}

// ── School ──────────────────────────────────────────────────────────

/**
 * A school is publicly discoverable when:
 * 1. onboarding_completed = true  (setup finished)
 * 2. status = 'active'            (not suspended/archived)
 *
 * Schools use school_organizations for org-level visibility.
 * Legacy school_profiles should also enforce onboarding_completed.
 *
 * Supabase query filters:
 *   .eq("onboarding_completed", true)
 *   .eq("status", "active")           // for school_organizations
 */
export function applySchoolPublicFilters<Q extends { eq: Function }>(query: Q): Q {
  return query
    .eq("onboarding_completed", true)
    .eq("status", "active") as Q;
}

/**
 * Legacy school_profiles don't have a status column.
 * Use this for the legacy table.
 */
export function applySchoolProfileLegacyPublicFilters<Q extends { eq: Function }>(query: Q): Q {
  return query.eq("onboarding_completed", true) as Q;
}
