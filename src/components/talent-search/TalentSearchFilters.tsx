/**
 * Talent Search Filter Types & Utilities — v4
 * All structured filters use taxonomy term IDs only.
 * No hardcoded option values for taxonomy-driven fields.
 */

export interface TalentFilters {
  // Location (cascading)
  regionId: string;
  countryId: string;
  cityId: string;

  // Teaching Context (taxonomy IDs)
  subjects: string[];
  curriculums: string[];
  gradeBands: string[];

  // International Profile (taxonomy IDs)
  languages: string[];          // taxonomy: languages
  nationalities: string[];      // taxonomy: nationalities
  nativeSpeaker: boolean;

  // Work Preferences (taxonomy IDs)
  workArrangements: string[];   // taxonomy: work_arrangements
  employmentTypes: string[];    // taxonomy: employment_types
  availabilityStatuses: string[]; // taxonomy: availability_status
  willingToRelocate: boolean;

  // Experience & Credentials
  expBucket: string;            // range bucket (not taxonomy — numeric range)
  certifications: string[];     // taxonomy: certifications
  hasTeachingLicense: boolean;

  // Verification (intelligence snapshot)
  verifiedOnly: boolean;
}

export const emptyFilters: TalentFilters = {
  regionId: "",
  countryId: "",
  cityId: "",
  subjects: [],
  curriculums: [],
  gradeBands: [],
  languages: [],
  nationalities: [],
  nativeSpeaker: false,
  workArrangements: [],
  employmentTypes: [],
  availabilityStatuses: [],
  willingToRelocate: false,
  expBucket: "",
  certifications: [],
  hasTeachingLicense: false,
  verifiedOnly: false,
};

export type SortOption = "recommended" | "relevant" | "experienced" | "available" | "updated" | "intelligence";

/** Count how many filters are active */
export function countActiveFilters(f: TalentFilters): number {
  let count = 0;
  if (f.regionId) count++;
  if (f.countryId) count++;
  if (f.cityId) count++;
  count += f.subjects.length;
  count += f.curriculums.length;
  count += f.gradeBands.length;
  count += f.languages.length;
  if (f.nativeSpeaker) count++;
  count += f.nationalities.length;
  count += f.workArrangements.length;
  count += f.employmentTypes.length;
  count += f.availabilityStatuses.length;
  if (f.willingToRelocate) count++;
  if (f.expBucket) count++;
  count += f.certifications.length;
  if (f.hasTeachingLicense) count++;
  if (f.verifiedOnly) count++;
  return count;
}
