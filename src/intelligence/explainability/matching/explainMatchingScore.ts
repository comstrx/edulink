/**
 * Matching Score Explainability
 * Sprint 8H-B
 */

import type { MatchingResult } from "@/intelligence/scoring/matching/matchingTypes";
import type { ExplainedScore } from "../core/explainabilityTypes";
import { buildItem, buildSummary } from "../core/explanationItemBuilder";

export function explainMatchingScore(result: MatchingResult): ExplainedScore {
  const items = [
    buildItem({
      key: "subjectMatch", label: "Subject Alignment", value: result.breakdown.subjectMatch, maxValue: 30,
      positiveMessage: "Strong subject alignment with this role.",
      neutralMessage: "Partial subject overlap detected.",
      warningMessage: "Subject alignment is weak or missing.",
      improvementHint: "Gain experience or qualifications in the required subjects.",
    }),
    buildItem({
      key: "curriculumMatch", label: "Curriculum Match", value: result.breakdown.curriculumMatch, maxValue: 20,
      positiveMessage: "Curriculum experience aligns well.",
      neutralMessage: "Curriculum match is partial.",
      warningMessage: "Curriculum alignment is missing.",
      improvementHint: "Pursue training or experience in the target curriculum.",
    }),
    buildItem({
      key: "gradeMatch", label: "Grade Band", value: result.breakdown.gradeMatch, maxValue: 15,
      positiveMessage: "Grade band experience matches the role.",
      neutralMessage: "Some grade band overlap exists.",
      warningMessage: "Grade band experience does not match.",
      improvementHint: "Consider expanding your grade band experience.",
    }),
    buildItem({
      key: "certificationMatch", label: "Certification Fit", value: result.breakdown.certificationMatch, maxValue: 15,
      positiveMessage: "Certifications meet the role requirements.",
      neutralMessage: "Some required certifications are present.",
      warningMessage: "Required certifications are not met.",
      improvementHint: "Obtain the certifications listed in the job requirements.",
    }),
    buildItem({
      key: "languageMatch", label: "Language Fit", value: result.breakdown.languageMatch, maxValue: 10,
      positiveMessage: "Language requirements are fully met.",
      neutralMessage: "Language fit is acceptable.",
      warningMessage: "Language requirements are not met.",
      improvementHint: "Develop proficiency in the required languages.",
    }),
    buildItem({
      key: "locationMatch", label: "Location Fit", value: result.breakdown.locationMatch, maxValue: 10,
      positiveMessage: "Location aligns with the role.",
      neutralMessage: "Location is a partial fit.",
      warningMessage: "Location does not match the role requirement.",
    }),
  ];

  return { score: result.score, items, summary: buildSummary(items) };
}
