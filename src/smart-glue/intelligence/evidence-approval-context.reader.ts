/**
 * Evidence Approval Context Reader — Sprint 11
 *
 * Reads intelligence state to determine whether approved mentorship evidence
 * is a meaningful trust/readiness signal or redundant.
 *
 * Pure read-only. No mutations.
 */

import { supabaseRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";

// ── Context Shape ─────────────────────────────────────────────

export interface EvidenceApprovalDecisionContext {
  /** Whether the teacher has existing recommendations */
  hasExistingRecommendations: boolean;
  /** Existing recommendation count */
  recommendationCount: number;
  /** Whether verified state data exists */
  hasVerifiedState: boolean;
  /** Count of already-verified credentials */
  verifiedCount: number;
  /** Total credential count */
  totalCredentials: number;
  /** Whether the competency termIds overlap with existing verified credentials */
  hasRedundantEvidence: boolean;
}

const EMPTY: EvidenceApprovalDecisionContext = {
  hasExistingRecommendations: false,
  recommendationCount: 0,
  hasVerifiedState: false,
  verifiedCount: 0,
  totalCredentials: 0,
  hasRedundantEvidence: false,
};

// ── Reader ─────────────────────────────────────────────────────

/**
 * Read intelligence context for a mentorship evidence approval.
 * Determines whether the evidence is a new trust signal or redundant.
 *
 * Fire-and-forget safe: errors return empty context.
 */
export async function readEvidenceApprovalContext(
  teacherId: string,
  competencyTermIds: string[],
): Promise<EvidenceApprovalDecisionContext> {
  try {
    const [recResult, verifiedResult] = await Promise.all([
      supabaseRepository.getTeacherRecommendationsSnapshot(teacherId),
      supabaseRepository.getTeacherVerifiedStateSnapshot(teacherId),
    ]);

    // Recommendation state
    let hasExistingRecommendations = false;
    let recommendationCount = 0;

    if (recResult.status !== "not_found") {
      hasExistingRecommendations = recResult.data.totalCount > 0;
      recommendationCount = recResult.data.totalCount;
    }

    // Verified state — check redundancy
    let hasVerifiedState = false;
    let verifiedCount = 0;
    let totalCredentials = 0;
    let hasRedundantEvidence = false;

    if (verifiedResult.status !== "not_found") {
      hasVerifiedState = true;
      verifiedCount = verifiedResult.data.verifiedCount;
      totalCredentials = verifiedResult.data.totalCount;

      // Check if all competency termIds are already covered
      // by existing verified credentials (simple overlap check)
      if (competencyTermIds.length > 0 && verifiedCount > 0) {
        // If teacher already has many verified credentials relative to new evidence,
        // this is likely redundant
        hasRedundantEvidence = verifiedCount >= 5 && competencyTermIds.length <= 1;
      }
    }

    return {
      hasExistingRecommendations,
      recommendationCount,
      hasVerifiedState,
      verifiedCount,
      totalCredentials,
      hasRedundantEvidence,
    };
  } catch {
    return EMPTY;
  }
}
