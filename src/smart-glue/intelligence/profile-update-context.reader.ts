/**
 * Profile Update Context Reader — Sprint 11
 *
 * Reads existing intelligence state for a teacher whose profile was updated.
 * Determines whether the update is meaningful (subject/experience/certifications/skills)
 * or cosmetic (bio, avatar, name).
 *
 * Pure read-only. No mutations.
 */

import { supabaseRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";

// ── Meaningful fields that should trigger recomputation ────────

const MEANINGFUL_FIELDS = new Set([
  "subject_term_ids",
  "subjects",
  "certification_term_ids",
  "certifications",
  "experience_years",
  "experience",
  "skills",
  "skill_term_ids",
  "curriculum_term_ids",
  "curriculum",
  "grade_band_term_ids",
  "grade_bands",
  "language_term_ids",
  "languages",
  "education_level",
  "education_level_term_id",
  "seniority_level_term_id",
  "role_type_term_id",
  "employment_type_term_ids",
]);

// ── Context Shape ─────────────────────────────────────────────

export interface ProfileUpdateDecisionContext {
  /** Whether any meaningful (intelligence-affecting) fields changed */
  hasMeaningfulChange: boolean;
  /** The meaningful fields that changed */
  meaningfulFields: string[];
  /** The cosmetic fields that changed */
  cosmeticFields: string[];
  /** Whether the teacher has existing recommendations */
  hasExistingRecommendations: boolean;
  /** Existing recommendation count */
  recommendationCount: number;
}

const EMPTY: ProfileUpdateDecisionContext = {
  hasMeaningfulChange: false,
  meaningfulFields: [],
  cosmeticFields: [],
  hasExistingRecommendations: false,
  recommendationCount: 0,
};

// ── Reader ─────────────────────────────────────────────────────

/**
 * Evaluate whether a profile update warrants intelligence recomputation.
 * Fire-and-forget safe: errors return empty context.
 */
export async function readProfileUpdateContext(
  teacherId: string,
  updatedFields: string[],
): Promise<ProfileUpdateDecisionContext> {
  try {
    const meaningfulFields = updatedFields.filter((f) => MEANINGFUL_FIELDS.has(f));
    const cosmeticFields = updatedFields.filter((f) => !MEANINGFUL_FIELDS.has(f));
    const hasMeaningfulChange = meaningfulFields.length > 0;

    // Only read recommendation state if meaningful change detected
    let hasExistingRecommendations = false;
    let recommendationCount = 0;

    if (hasMeaningfulChange) {
      const recResult = await supabaseRepository.getTeacherRecommendationsSnapshot(teacherId);
      if (recResult.status !== "not_found") {
        hasExistingRecommendations = recResult.data.totalCount > 0;
        recommendationCount = recResult.data.totalCount;
      }
    }

    return {
      hasMeaningfulChange,
      meaningfulFields,
      cosmeticFields,
      hasExistingRecommendations,
      recommendationCount,
    };
  } catch {
    return EMPTY;
  }
}
