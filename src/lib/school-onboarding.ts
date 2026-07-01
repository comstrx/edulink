/**
 * School onboarding completion utilities.
 * Pure functions — no UI or Supabase dependencies.
 */

interface SchoolProfileLike {
  onboarding_completed?: boolean | null;
  name?: string | null;
  country_term_id?: string | null;
  school_type_term_id?: string | null;
  curriculum_term_ids?: string[] | null;
}

const REQUIRED_FIELDS: { key: keyof SchoolProfileLike; label: string }[] = [
  { key: "name", label: "name" },
  { key: "country_term_id", label: "country" },
  { key: "school_type_term_id", label: "school_type" },
  { key: "curriculum_term_ids", label: "curricula" },
];

/**
 * Returns true if the school profile is considered onboarding-complete.
 * Derived from required fields — the boolean flag is only an accelerator,
 * never sufficient on its own without actual data.
 */
export function isSchoolProfileCompleted(profile: SchoolProfileLike | null | undefined): boolean {
  if (!profile) return false;

  const hasRequiredFields = getMissingSchoolProfileFields(profile).length === 0;
  // If the flag is set but data is missing, the flag is stale — treat as incomplete
  return hasRequiredFields;
}

/**
 * Returns an array of missing field labels (e.g. "name", "country").
 * Empty array means the profile satisfies minimum requirements.
 */
export function getMissingSchoolProfileFields(profile: SchoolProfileLike | null | undefined): string[] {
  if (!profile) return REQUIRED_FIELDS.map((f) => f.label);

  return REQUIRED_FIELDS.filter((f) => {
    const val = profile[f.key];
    if (val == null) return true;
    if (typeof val === "string" && val.trim() === "") return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  }).map((f) => f.label);
}
