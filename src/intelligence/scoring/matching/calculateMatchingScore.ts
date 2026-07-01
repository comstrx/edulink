/**
 * Matching Score Engine — Pure Deterministic Logic
 * Sprint 8H-A: Score & Logic Stabilization
 *
 * Max score: 100
 *   Subject match:       30
 *   Curriculum match:    20
 *   Grade band match:    15
 *   Certification match: 15
 *   Language match:      10
 *   Location fit:        10
 */

import type { MatchingTeacherInput, MatchingJobInput, MatchingResult } from "./matchingTypes";

const MAX_SUBJECT = 30;
const MAX_CURRICULUM = 20;
const MAX_GRADE = 15;
const MAX_CERTIFICATION = 15;
const MAX_LANGUAGE = 10;
const MAX_LOCATION = 10;

/** Compute overlap ratio: |intersection| / |required|, or 1 if required is empty */
function overlapRatio(teacherSet: string[], requiredSet: string[]): number {
  if (requiredSet.length === 0) return 1;
  const tSet = new Set(teacherSet);
  const matched = requiredSet.filter((id) => tSet.has(id)).length;
  return matched / requiredSet.length;
}

function scoreLocation(teacherLoc: string | null, jobLoc: string | null): number {
  if (!jobLoc) return MAX_LOCATION; // no location requirement
  if (!teacherLoc) return 0;
  return teacherLoc === jobLoc ? MAX_LOCATION : 0;
}

export function calculateMatchingScore(
  teacher: MatchingTeacherInput,
  job: MatchingJobInput,
): MatchingResult {
  const breakdown = {
    subjectMatch: Math.round(overlapRatio(teacher.subjectIds, job.subjectIds) * MAX_SUBJECT),
    curriculumMatch: Math.round(overlapRatio(teacher.curriculumIds, job.curriculumIds) * MAX_CURRICULUM),
    gradeMatch: Math.round(overlapRatio(teacher.gradeBandIds, job.gradeBandIds) * MAX_GRADE),
    certificationMatch: Math.round(overlapRatio(teacher.certificationIds, job.certificationIds) * MAX_CERTIFICATION),
    languageMatch: Math.round(overlapRatio(teacher.languageIds, job.languageIds) * MAX_LANGUAGE),
    locationMatch: scoreLocation(teacher.locationTermId, job.locationTermId),
  };

  const score = Math.min(
    100,
    breakdown.subjectMatch +
      breakdown.curriculumMatch +
      breakdown.gradeMatch +
      breakdown.certificationMatch +
      breakdown.languageMatch +
      breakdown.locationMatch,
  );

  return { score, breakdown };
}
