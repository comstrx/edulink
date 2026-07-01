/**
 * Hiring-to-Growth Mapper — Sprint 7C
 *
 * Translates hiring rejection reasons and evaluation signals
 * into normalized growth intervention targets.
 *
 * Deterministic. Pure function. No DB calls.
 *
 * Mapping rules:
 * - Rejection reasons map to gap types via slug patterns
 * - Match weaknesses map to competency gaps
 * - Missing credentials map to certification gaps
 */

import type {
  GrowthInterventionTarget,
  HiringGrowthMappingResult,
  GrowthGapType,
  GrowthActionType,
  GrowthUrgency,
} from "./types/growth-recommendation.types";

// ── Rejection Reason → Gap Type Mapping ────────────────────────

interface ReasonMapping {
  gapType: GrowthGapType;
  defaultAction: GrowthActionType;
  urgency: GrowthUrgency;
  context: string;
}

/**
 * Slug-prefix based mapping from rejection reason taxonomy slugs
 * to growth gap types. This is deterministic and explainable.
 */
const REASON_SLUG_MAPPINGS: Record<string, ReasonMapping> = {
  "missing-certification": {
    gapType: "certification",
    defaultAction: "pursue_credential",
    urgency: "high",
    context: "Rejected due to missing required certification",
  },
  "weak-curriculum": {
    gapType: "curriculum_competency",
    defaultAction: "start_pathway",
    urgency: "high",
    context: "Rejected due to weak curriculum alignment",
  },
  "insufficient-experience": {
    gapType: "experience",
    defaultAction: "submit_evidence",
    urgency: "medium",
    context: "Rejected due to insufficient teaching experience",
  },
  "missing-evidence": {
    gapType: "evidence_verification",
    defaultAction: "submit_evidence",
    urgency: "high",
    context: "Rejected due to lack of verified teaching artifacts",
  },
  "language-proficiency": {
    gapType: "language_proficiency",
    defaultAction: "enroll_course",
    urgency: "medium",
    context: "Rejected due to language proficiency gap",
  },
  "classroom-practice": {
    gapType: "classroom_practice",
    defaultAction: "submit_evidence",
    urgency: "high",
    context: "Rejected due to unverified classroom practice",
  },
  "subject-mismatch": {
    gapType: "subject_expertise",
    defaultAction: "enroll_course",
    urgency: "medium",
    context: "Rejected due to subject area mismatch",
  },
  "incomplete-pathway": {
    gapType: "pathway_completion",
    defaultAction: "continue_pathway",
    urgency: "medium",
    context: "Rejected due to incomplete professional development pathway",
  },
};

// Fallback for unknown rejection reasons
const FALLBACK_MAPPING: ReasonMapping = {
  gapType: "curriculum_competency",
  defaultAction: "enroll_course",
  urgency: "low",
  context: "Rejected — general professional development recommended",
};

// ── Mapper ─────────────────────────────────────────────────────

export interface HiringGrowthMapperInput {
  teacherId: string;
  rejectionReasonTermIds: string[];
  /** Optional: slug-resolved rejection reasons for better mapping */
  rejectionReasonSlugs?: string[];
  /** Optional: unmatched term IDs from match engine */
  unmatchedTermIds?: string[];
  /** Optional: gap term IDs from gap snapshots */
  gapTermIds?: string[];
  sourceEvent?: string;
  /** Sprint 12: Profile state signals for baseline evaluation */
  profileState?: {
    profileComplete: boolean;
    skillsCount: number;
    credentialsCount: number;
    hasTrainingHistory: boolean;
  };
}

/**
 * Maps hiring signals to growth intervention targets.
 * Pure function — deterministic and explainable.
 */
export function mapHiringToGrowth(
  input: HiringGrowthMapperInput,
): HiringGrowthMappingResult {
  const targets: GrowthInterventionTarget[] = [];

  // 1. Map rejection reasons to growth targets
  for (let i = 0; i < input.rejectionReasonTermIds.length; i++) {
    const termId = input.rejectionReasonTermIds[i];
    const slug = input.rejectionReasonSlugs?.[i];

    const mapping = resolveMapping(slug, termId);

    targets.push({
      teacherId: input.teacherId,
      sourceType: "rejection_feedback",
      sourceTermIds: [termId],
      sourceReferenceId: undefined,
      targetGapType: mapping.gapType,
      targetCompetencyTermIds: [],
      targetCredentialTermIds: mapping.gapType === "certification" ? [termId] : [],
      targetCurriculumTermIds: mapping.gapType === "curriculum_competency" ? [termId] : [],
      targetActionType: mapping.defaultAction,
      urgencyLevel: mapping.urgency,
      recommendationContext: mapping.context,
    });
  }

  // 2. Map unmatched terms from match engine as weaker signals
  if (input.unmatchedTermIds) {
    for (const termId of input.unmatchedTermIds) {
      // Only add if not already covered by rejection reasons
      if (input.rejectionReasonTermIds.includes(termId)) continue;

      targets.push({
        teacherId: input.teacherId,
        sourceType: "gap_analysis",
        sourceTermIds: [termId],
        targetGapType: "curriculum_competency",
        targetCompetencyTermIds: [termId],
        targetCredentialTermIds: [],
        targetCurriculumTermIds: [],
        targetActionType: "enroll_course",
        urgencyLevel: "low",
        recommendationContext: "Weak match signal — competency improvement suggested",
      });
    }
  }

  // 3. Map gap profile terms
  if (input.gapTermIds) {
    for (const termId of input.gapTermIds) {
      if (input.rejectionReasonTermIds.includes(termId)) continue;

      targets.push({
        teacherId: input.teacherId,
        sourceType: "gap_analysis",
        sourceTermIds: [termId],
        targetGapType: "curriculum_competency",
        targetCompetencyTermIds: [termId],
        targetCredentialTermIds: [],
        targetCurriculumTermIds: [],
        targetActionType: "enroll_course",
        urgencyLevel: "medium",
        recommendationContext: "Identified gap in professional competency profile",
      });
    }
  }

  // 4. Sprint 12: Baseline profile-state targets for cold-start teachers
  //    Only fires when no rejection/gap targets were generated
  if (targets.length === 0 && input.profileState) {
    const ps = input.profileState;

    if (!ps.profileComplete) {
      targets.push({
        teacherId: input.teacherId,
        sourceType: "gap_analysis",
        sourceTermIds: [],
        targetGapType: "experience",
        targetCompetencyTermIds: [],
        targetCredentialTermIds: [],
        targetCurriculumTermIds: [],
        targetActionType: "submit_evidence",
        urgencyLevel: "high",
        recommendationContext: "Complete your professional profile to improve visibility to schools",
      });
    }

    if (ps.skillsCount < 3) {
      targets.push({
        teacherId: input.teacherId,
        sourceType: "gap_analysis",
        sourceTermIds: [],
        targetGapType: "subject_expertise",
        targetCompetencyTermIds: [],
        targetCredentialTermIds: [],
        targetCurriculumTermIds: [],
        targetActionType: "enroll_course",
        urgencyLevel: ps.skillsCount === 0 ? "high" : "medium",
        recommendationContext: ps.skillsCount === 0
          ? "Add your teaching skills to unlock personalized recommendations"
          : "Strengthen your skill profile — add more teaching competencies",
      });
    }

    if (ps.credentialsCount === 0) {
      targets.push({
        teacherId: input.teacherId,
        sourceType: "gap_analysis",
        sourceTermIds: [],
        targetGapType: "certification",
        targetCompetencyTermIds: [],
        targetCredentialTermIds: [],
        targetCurriculumTermIds: [],
        targetActionType: "pursue_credential",
        urgencyLevel: "medium",
        recommendationContext: "Upload or earn credentials to strengthen your professional trust profile",
      });
    }

    if (!ps.hasTrainingHistory) {
      targets.push({
        teacherId: input.teacherId,
        sourceType: "gap_analysis",
        sourceTermIds: [],
        targetGapType: "pathway_completion",
        targetCompetencyTermIds: [],
        targetCredentialTermIds: [],
        targetCurriculumTermIds: [],
        targetActionType: "start_pathway",
        urgencyLevel: "medium",
        recommendationContext: "Start a professional development pathway to accelerate your career growth",
      });
    }
  }

  return {
    teacherId: input.teacherId,
    interventionTargets: targets,
    mappedAt: new Date().toISOString(),
    sourceEvent: input.sourceEvent,
  };
}

// ── Internal ───────────────────────────────────────────────────

function resolveMapping(slug?: string, _termId?: string): ReasonMapping {
  if (!slug) return FALLBACK_MAPPING;

  // Try exact match first
  if (REASON_SLUG_MAPPINGS[slug]) return REASON_SLUG_MAPPINGS[slug];

  // Try prefix match
  for (const [prefix, mapping] of Object.entries(REASON_SLUG_MAPPINGS)) {
    if (slug.startsWith(prefix) || slug.includes(prefix)) {
      return mapping;
    }
  }

  return FALLBACK_MAPPING;
}
