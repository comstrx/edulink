/**
 * Surface Framing Layer — UI-only text differentiation
 *
 * Wraps existing presentation helpers (formatRecommendationTitle, getExplanationLine, getImpactLine)
 * to produce surface-aware framing. No logic, no data changes — pure text transformation.
 */

import { formatRecommendationTitle, getExplanationLine, getImpactLine } from "@/intelligence/adapters/recommendation-presentation.constants";
import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

export type SurfaceIntent = "dashboard" | "skills" | "recommendations" | "default";

// ── Action type → skill domain mapping ────────────────────────

const ACTION_SKILL_MAP: Record<string, string> = {
  enroll_course: "professional development",
  course_recommendation: "professional development",
  complete_missing_course: "learning gaps",
  start_pathway: "career pathway",
  continue_pathway: "career pathway",
  continue_pathway_action: "career pathway",
  submit_evidence: "verified credentials",
  submit_evidence_action: "verified credentials",
  revise_evidence: "credential quality",
  revise_submission_action: "credential quality",
  request_mentor_validation: "mentor-verified skills",
  request_mentor_validation_action: "mentor-verified skills",
  pursue_credential: "professional credentials",
  pursue_credential_action: "professional credentials",
  certification_recommendation: "certifications",
  profile_completion_action: "profile completeness",
  verification_action: "verified status",
  curriculum_alignment_action: "curriculum alignment",
  language_improvement_action: "language proficiency",
  experience_building_action: "professional experience",
  pathway_recommendation: "career pathway",
  job_recommendation: "job readiness",
};

function getSkillDomain(actionType: string): string {
  return ACTION_SKILL_MAP[actionType] ?? "your profile";
}

// ── Framed Title ──────────────────────────────────────────────

export function getFramedTitle(rec: UIRecommendation, surface: SurfaceIntent): string {
  const base = formatRecommendationTitle(rec.title);

  switch (surface) {
    case "dashboard":
      // Decisive, action-first
      if (rec.actionType.includes("course") || rec.actionType.includes("enroll")) {
        return `Start: ${base}`;
      }
      if (rec.actionType.includes("evidence") || rec.actionType.includes("submit")) {
        return `Submit: ${base}`;
      }
      if (rec.actionType.includes("pathway")) {
        return `Continue: ${base}`;
      }
      if (rec.actionType.includes("credential") || rec.actionType.includes("certification")) {
        return `Pursue: ${base}`;
      }
      if (rec.actionType.includes("profile")) {
        return `Complete: ${base}`;
      }
      return base;

    case "skills": {
      // Gap-context framing
      const domain = getSkillDomain(rec.actionType);
      return `Improve ${domain}: ${base}`;
    }

    case "recommendations":
      // Exploratory, soft
      return base;

    default:
      return base;
  }
}

// ── Framed Explanation ────────────────────────────────────────

export function getFramedExplanation(rec: UIRecommendation, surface: SurfaceIntent): string | null {
  const base = getExplanationLine(rec);

  switch (surface) {
    case "dashboard":
      // Priority / urgency framing
      if (rec.priority === "high") {
        return base ? `Priority action — ${base}` : "This is your highest priority action right now";
      }
      return base ?? "Recommended based on your current profile";

    case "skills": {
      // Gap-context framing
      const domain = getSkillDomain(rec.actionType);
      if (base) {
        return `Gap in ${domain} — ${base}`;
      }
      return `This addresses a gap in your ${domain}`;
    }

    case "recommendations":
      // Exploratory, informative
      if (base) {
        return `You might benefit: ${base}`;
      }
      return "Suggested based on your profile and career goals";

    default:
      return base;
  }
}

// ── Framed Subtitle ───────────────────────────────────────────

export function getFramedSubtitle(rec: UIRecommendation, surface: SurfaceIntent): string | null {
  const impact = getImpactLine(rec);

  switch (surface) {
    case "dashboard":
      return impact;

    case "skills": {
      const domain = getSkillDomain(rec.actionType);
      return `Strengthens your ${domain}`;
    }

    case "recommendations":
      return impact;

    default:
      return impact;
  }
}
