/**
 * CRI Explainability
 * Sprint 8H-B
 */

import type { CriResult } from "@/intelligence/scoring/cri/criTypes";
import type { ExplainedScore } from "../core/explainabilityTypes";
import { buildItem, buildSummary } from "../core/explanationItemBuilder";

export function explainCRI(result: CriResult): ExplainedScore {
  const items = [
    buildItem({
      key: "education", label: "Education", value: result.breakdown.education, maxValue: 20,
      positiveMessage: "Your education profile strongly supports your career readiness.",
      neutralMessage: "Your education level provides moderate readiness support.",
      warningMessage: "Education details are limited or missing.",
      improvementHint: "Add your highest education qualification to strengthen this area.",
    }),
    buildItem({
      key: "experience", label: "Experience", value: result.breakdown.experience, maxValue: 20,
      positiveMessage: "Your teaching experience is a strong readiness factor.",
      neutralMessage: "Your experience provides a reasonable readiness foundation.",
      warningMessage: "Limited teaching experience recorded.",
      improvementHint: "Ensure your years of experience are accurately reflected in your profile.",
    }),
    buildItem({
      key: "certifications", label: "Certifications", value: result.breakdown.certifications, maxValue: 20,
      positiveMessage: "Strong certification coverage boosts your readiness.",
      neutralMessage: "Your certification contribution is moderate.",
      warningMessage: "Certification contribution is currently limited.",
      improvementHint: "Add recognized teaching certifications to increase readiness.",
    }),
    buildItem({
      key: "training", label: "Training", value: result.breakdown.training, maxValue: 15,
      positiveMessage: "Active training record demonstrates professional growth.",
      neutralMessage: "Some training completed, with room for more.",
      warningMessage: "No or very few training completions recorded.",
      improvementHint: "Complete professional development courses to improve this dimension.",
    }),
    buildItem({
      key: "language", label: "Language", value: result.breakdown.language, maxValue: 10,
      positiveMessage: "Language proficiency is well documented.",
      neutralMessage: "Language information is partially available.",
      warningMessage: "Language proficiency details are missing.",
      improvementHint: "Add your language proficiency level to your profile.",
    }),
    buildItem({
      key: "verification", label: "Verification", value: result.breakdown.verification, maxValue: 15,
      positiveMessage: "Verified credentials strengthen your profile trust.",
      neutralMessage: "Partial verification in place.",
      warningMessage: "Profile verification is incomplete.",
      improvementHint: "Complete identity, education, and experience verification.",
    }),
  ];

  return { score: result.score, items, summary: buildSummary(items) };
}
