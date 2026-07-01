/**
 * getMentorCompleteness — Domain logic for mentor profile readiness.
 * Determines whether a mentor has filled in all required fields.
 */

export interface MentorCompletenessInput {
  bio: string | null;
  headline: string | null;
  years_experience: number | null;
  specialization_count: number;
  languages: string[];
}

export interface MentorCompleteness {
  isComplete: boolean;
  completionPercent: number;
  missingFields: string[];
}

export function getMentorCompleteness(input: MentorCompletenessInput): MentorCompleteness {
  const missingFields: string[] = [];

  if (!input.bio || input.bio.trim().length < 20) {
    missingFields.push("bio");
  }

  if (!input.headline || input.headline.trim().length < 5) {
    missingFields.push("headline");
  }

  if (input.years_experience == null || input.years_experience < 0) {
    missingFields.push("years_experience");
  }

  if (input.specialization_count < 1) {
    missingFields.push("specializations");
  }

  if (!input.languages || input.languages.length === 0) {
    missingFields.push("languages");
  }

  const totalFields = 5;
  const completedFields = totalFields - missingFields.length;
  const completionPercent = Math.round((completedFields / totalFields) * 100);

  return {
    isComplete: missingFields.length === 0,
    completionPercent,
    missingFields,
  };
}
