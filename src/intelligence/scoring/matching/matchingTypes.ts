/**
 * Matching Score Engine — Types
 * Sprint 8H-A: Score & Logic Stabilization
 */

export interface MatchingTeacherInput {
  subjectIds: string[];
  curriculumIds: string[];
  gradeBandIds: string[];
  certificationIds: string[];
  languageIds: string[];
  locationTermId: string | null;
}

export interface MatchingJobInput {
  subjectIds: string[];
  curriculumIds: string[];
  gradeBandIds: string[];
  certificationIds: string[];
  languageIds: string[];
  locationTermId: string | null;
}

export interface MatchingBreakdown {
  subjectMatch: number;
  curriculumMatch: number;
  gradeMatch: number;
  certificationMatch: number;
  languageMatch: number;
  locationMatch: number;
}

export interface MatchingResult {
  score: number;
  breakdown: MatchingBreakdown;
}
