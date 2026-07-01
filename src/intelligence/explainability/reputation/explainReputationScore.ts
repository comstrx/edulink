/**
 * Reputation Score Explainability
 * Sprint 8H-B
 */

import type { ReputationResult } from "@/intelligence/scoring/reputation/reputationTypes";
import type { ExplainedScore } from "../core/explainabilityTypes";
import { buildItem, buildSummary } from "../core/explanationItemBuilder";

export function explainReputationScore(result: ReputationResult): ExplainedScore {
  const items = [
    buildItem({
      key: "experience", label: "Experience", value: result.breakdown.experience, maxValue: 25,
      positiveMessage: "Strong professional maturity through years of experience.",
      neutralMessage: "Moderate experience level recorded.",
      warningMessage: "Limited professional experience.",
      improvementHint: "Continue building your teaching career to strengthen this dimension.",
    }),
    buildItem({
      key: "certifications", label: "Certifications", value: result.breakdown.certifications, maxValue: 25,
      positiveMessage: "Well-credentialed professional profile.",
      neutralMessage: "Some certifications contribute to reputation.",
      warningMessage: "Certification coverage is low.",
      improvementHint: "Pursue additional recognized certifications.",
    }),
    buildItem({
      key: "training", label: "Training", value: result.breakdown.training, maxValue: 20,
      positiveMessage: "Active professional development strengthens credibility.",
      neutralMessage: "Some training activity recorded.",
      warningMessage: "Very limited training activity.",
      improvementHint: "Complete more professional development courses.",
    }),
    buildItem({
      key: "verification", label: "Verification", value: result.breakdown.verification, maxValue: 15,
      positiveMessage: "Verified documents increase profile trust.",
      neutralMessage: "Some documents have been verified.",
      warningMessage: "Profile trust can be improved through verification.",
      improvementHint: "Submit documents for verification to increase credibility.",
    }),
    buildItem({
      key: "endorsements", label: "Endorsements", value: result.breakdown.endorsements, maxValue: 15,
      positiveMessage: "Institutional endorsements validate professional standing.",
      neutralMessage: "Some institutional validation present.",
      warningMessage: "Limited institutional validation.",
      improvementHint: "Seek endorsements from schools or institutions you have worked with.",
    }),
  ];

  return { score: result.score, items, summary: buildSummary(items) };
}
