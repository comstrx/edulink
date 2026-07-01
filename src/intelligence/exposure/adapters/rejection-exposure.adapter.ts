/**
 * Rejection Exposure Adapter
 *
 * Transforms rejection reason data into audience-scoped DTOs.
 * - Teacher: sees improvement-oriented recommendations (never raw reasons)
 * - School: sees raw rejection reason
 * - Public/Admin: hidden / full respectively
 *
 * Phase 4.1 — Intelligence Governance
 */

import type { ExposureAudience, RejectionExposed, RejectionExposedSchool, RejectionExposedTeacher, ExposedHidden } from "../types/exposure.types";
import { getExposureLevel } from "../rules/exposure-rules";

export interface RejectionSourceData {
  rejectionReasonTermId: string;
  rejectionReasonLabel: string;
  rejectionNotes?: string | null;
}

/**
 * Maps a raw rejection reason to a teacher-facing improvement recommendation.
 */
function toImprovementHint(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("experience")) return "Consider gaining more relevant experience";
  if (lower.includes("qualification") || lower.includes("certification")) return "Additional qualifications may strengthen future applications";
  if (lower.includes("location") || lower.includes("visa")) return "Explore opportunities matching your location or visa status";
  if (lower.includes("language")) return "Language proficiency development could open more opportunities";
  if (lower.includes("fit") || lower.includes("culture")) return "Explore schools whose culture aligns with your strengths";
  return "Keep building your profile to strengthen future applications";
}

export function exposeRejection(
  data: RejectionSourceData | null,
  audience: ExposureAudience,
): RejectionExposed {
  const level = getExposureLevel("rejection", audience);

  if (level === "hidden" || !data) {
    return { level: "hidden" } as ExposedHidden;
  }

  if (level === "full") {
    // School sees raw rejection reason
    return {
      level: "full",
      rejectionReasonLabel: data.rejectionReasonLabel,
      rejectionNotes: data.rejectionNotes ?? null,
    } as RejectionExposedSchool;
  }

  // summary — teacher sees improvement hint only
  return {
    level: "summary",
    improvementHint: toImprovementHint(data.rejectionReasonLabel),
  } as RejectionExposedTeacher;
}
