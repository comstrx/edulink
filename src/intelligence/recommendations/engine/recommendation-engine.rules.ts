/**
 * Recommendation Engine v1 — Centralized Rules
 *
 * Priority, confidence, eligibility, grouping, deduplication,
 * and action label logic for recommendation generation.
 *
 * Phase 7C — Live Implementation
 */

import type {
  RecommendationPriority,
  RecommendationConfidence,
  RecommendationType,
  RecommendationGroupKey,
  RecommendationItem,
  RecommendationGroupSummary,
  RecommendationReasonCode,
} from "./recommendation-engine.types";

// ── Priority Ranking ───────────────────────────────────────────

export const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const CONFIDENCE_RANK: Record<RecommendationConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Foundational types get a priority boost when they block other actions */
const FOUNDATIONAL_TYPES: Set<RecommendationType> = new Set([
  "profile_completion_action",
  "verification_action",
]);

// ── Type → Group Mapping ───────────────────────────────────────

export const TYPE_TO_GROUP: Record<RecommendationType, RecommendationGroupKey> = {
  course_recommendation: "training_actions",
  pathway_recommendation: "training_actions",
  certification_recommendation: "certification_actions",
  job_recommendation: "job_actions",
  profile_completion_action: "profile_actions",
  verification_action: "trust_actions",
  curriculum_alignment_action: "curriculum_alignment_actions",
  language_improvement_action: "training_actions",
  experience_building_action: "career_readiness_actions",
  continue_pathway_action: "pathway_progress_actions",
  submit_evidence_action: "evidence_actions",
  revise_submission_action: "evidence_actions",
  request_mentor_validation_action: "evidence_actions",
  pursue_credential_action: "certification_actions",
};

// ── Action Label Keys ──────────────────────────────────────────

export const ACTION_LABEL_KEYS: Record<RecommendationType, string> = {
  course_recommendation: "action.enroll_course",
  pathway_recommendation: "action.start_pathway",
  certification_recommendation: "action.pursue_certification",
  job_recommendation: "action.apply_to_job",
  profile_completion_action: "action.complete_profile",
  verification_action: "action.verify_credential",
  curriculum_alignment_action: "action.align_curriculum",
  language_improvement_action: "action.improve_language",
  experience_building_action: "action.build_experience",
  continue_pathway_action: "action.continue_pathway",
  submit_evidence_action: "action.submit_evidence",
  revise_submission_action: "action.revise_submission",
  request_mentor_validation_action: "action.request_mentor_validation",
  pursue_credential_action: "action.pursue_credential",
};

// ── Priority Rules ─────────────────────────────────────────────

const SEV_TO_PRIORITY: Record<string, RecommendationPriority> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

export function computeRecommendationPriority(
  gapSeverity?: string,
  isFoundational?: boolean,
  evidenceCount?: number,
): RecommendationPriority {
  let base = SEV_TO_PRIORITY[gapSeverity ?? ""] ?? "medium";

  // Foundational actions get a boost
  if (isFoundational && PRIORITY_RANK[base] < PRIORITY_RANK["high"]) {
    base = "high";
  }

  // Strong evidence can elevate medium → high
  if ((evidenceCount ?? 0) >= 3 && base === "medium") {
    base = "high";
  }

  return base;
}

// ── Confidence Rules ───────────────────────────────────────────

export function computeRecommendationConfidence(
  evidenceCount: number,
  hasCatalogMatch?: boolean,
): RecommendationConfidence {
  if (evidenceCount >= 3 || (evidenceCount >= 2 && hasCatalogMatch)) return "high";
  if (evidenceCount >= 2 || hasCatalogMatch) return "medium";
  return "low";
}

// ── Eligibility ────────────────────────────────────────────────

export function isRecommendationEligible(
  type: RecommendationType,
  context: { alreadyVerified?: boolean; profileComplete?: boolean },
): boolean {
  if (type === "verification_action" && context.alreadyVerified) return false;
  if (type === "profile_completion_action" && context.profileComplete) return false;
  return true;
}

// ── Grouping ───────────────────────────────────────────────────

export function resolveGroupKey(type: RecommendationType): RecommendationGroupKey {
  return TYPE_TO_GROUP[type] ?? "career_readiness_actions";
}

// ── Sorting ────────────────────────────────────────────────────

export function sortRecommendations(items: RecommendationItem[]): RecommendationItem[] {
  return [...items].sort((a, b) => {
    const isFoundA = FOUNDATIONAL_TYPES.has(a.recommendationType) ? 5 : 0;
    const isFoundB = FOUNDATIONAL_TYPES.has(b.recommendationType) ? 5 : 0;
    const scoreA = PRIORITY_RANK[a.priority] * 10 + CONFIDENCE_RANK[a.confidence] * 3 + isFoundA;
    const scoreB = PRIORITY_RANK[b.priority] * 10 + CONFIDENCE_RANK[b.confidence] * 3 + isFoundB;
    return scoreB - scoreA;
  });
}

// ── Deduplication ──────────────────────────────────────────────

/**
 * Dedup by (type + targetId) or (type + first relatedGapId).
 * Keeps the higher-priority item.
 */
export function deduplicateRecommendations(items: RecommendationItem[]): RecommendationItem[] {
  const seen = new Map<string, RecommendationItem>();

  for (const item of items) {
    const key = item.targetId
      ? `${item.recommendationType}::${item.targetId}`
      : `${item.recommendationType}::${item.relatedGapIds[0] ?? item.recommendationId}`;

    const existing = seen.get(key);
    if (!existing || PRIORITY_RANK[item.priority] > PRIORITY_RANK[existing.priority]) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}

// ── Same-Type Grouping ────────────────────────────────────────

/**
 * Groups multiple recommendations of the same type into a single
 * consolidated item. Merges relatedGapIds, relatedTaxonomyTermIds,
 * and reasonCodes. Uses the highest priority from the group.
 *
 * Also suppresses generic items (no relatedTaxonomyTermIds) when
 * specific items of the same type exist.
 */
export function groupSameTypeRecommendations(items: RecommendationItem[]): RecommendationItem[] {
  // Group by recommendationType
  const byType = new Map<string, RecommendationItem[]>();
  for (const item of items) {
    const group = byType.get(item.recommendationType) ?? [];
    group.push(item);
    byType.set(item.recommendationType, group);
  }

  const result: RecommendationItem[] = [];

  for (const [, group] of byType) {
    if (group.length <= 1) {
      result.push(...group);
      continue;
    }

    // Separate specific (has relatedTaxonomyTermIds) vs generic
    const specific = group.filter((r) => r.relatedTaxonomyTermIds.length > 0);
    const generic = group.filter((r) => r.relatedTaxonomyTermIds.length === 0);

    // If specific items exist, suppress generic ones
    const toMerge = specific.length > 0 ? specific : generic;

    // Merge into a single consolidated item
    const merged = mergeItems(toMerge);
    result.push(merged);
  }

  return result;
}

function mergeItems(items: RecommendationItem[]): RecommendationItem {
  if (items.length === 1) return items[0];

  // Use highest priority
  let bestPriority = items[0].priority;
  let bestConfidence = items[0].confidence;
  for (const item of items) {
    if (PRIORITY_RANK[item.priority] > PRIORITY_RANK[bestPriority]) {
      bestPriority = item.priority;
    }
    if (CONFIDENCE_RANK[item.confidence] > CONFIDENCE_RANK[bestConfidence]) {
      bestConfidence = item.confidence;
    }
  }

  // Merge all term IDs, gap IDs, reason codes (deduplicated)
  const allGapIds = [...new Set(items.flatMap((r) => r.relatedGapIds))];
  const allTermIds = [...new Set(items.flatMap((r) => r.relatedTaxonomyTermIds))];
  const allReasonCodes = [...new Set(items.flatMap((r) => r.reasonCodes))];

  return {
    ...items[0],
    priority: bestPriority,
    confidence: bestConfidence,
    relatedGapIds: allGapIds,
    relatedTaxonomyTermIds: allTermIds,
    reasonCodes: allReasonCodes,
  };
}

// ── Per-ActionType Cap ────────────────────────────────────────

const MAX_PER_ACTION_TYPE: Partial<Record<string, number>> = {
  certification_recommendation: 1,
  course_recommendation: 3,
  job_recommendation: 3,
  profile_completion_action: 1,
  verification_action: 1,
  curriculum_alignment_action: 2,
  language_improvement_action: 1,
  experience_building_action: 1,
};

const DEFAULT_CAP = 2;

/**
 * Caps the number of recommendations per actionType.
 * Items should be pre-sorted by priority so the best ones survive.
 */
export function capPerActionType(items: RecommendationItem[]): RecommendationItem[] {
  const counts = new Map<string, number>();
  return items.filter((item) => {
    const type = item.recommendationType;
    const max = MAX_PER_ACTION_TYPE[type] ?? DEFAULT_CAP;
    const current = counts.get(type) ?? 0;
    if (current >= max) return false;
    counts.set(type, current + 1);
    return true;
  });
}

// ── Grouped Summary Builder ────────────────────────────────────

export function buildGroupedSummary(items: RecommendationItem[]): RecommendationGroupSummary[] {
  const groups = new Map<RecommendationGroupKey, { count: number; highestPriority: RecommendationPriority }>();

  for (const item of items) {
    const existing = groups.get(item.groupKey);
    if (!existing) {
      groups.set(item.groupKey, { count: 1, highestPriority: item.priority });
    } else {
      existing.count++;
      if (PRIORITY_RANK[item.priority] > PRIORITY_RANK[existing.highestPriority]) {
        existing.highestPriority = item.priority;
      }
    }
  }

  const labels: Record<string, string> = {
    immediate_actions: "Immediate Actions",
    profile_actions: "Profile Actions",
    trust_actions: "Trust & Verification",
    training_actions: "Training & Development",
    certification_actions: "Certifications",
    curriculum_alignment_actions: "Curriculum Alignment",
    career_readiness_actions: "Career Readiness",
    job_actions: "Job Opportunities",
  };

  return Array.from(groups.entries()).map(([key, val]) => ({
    groupKey: key,
    label: labels[key] ?? key,
    count: val.count,
    highestPriority: val.highestPriority,
  }));
}

// ── Reason Summary Builder ─────────────────────────────────────

const REASON_MESSAGES: Record<string, string> = {
  profile_incomplete: "Profile has missing core fields",
  verification_missing: "Credentials need verification",
  missing_required_certification: "Missing a required certification",
  repeated_curriculum_mismatch: "Curriculum mismatch detected across jobs",
  weak_training_foundation: "Limited training history",
  low_cri_score: "Career readiness score needs improvement",
  strong_catalog_match_found: "Matching training available in catalog",
  experience_gap_detected: "Experience gap identified",
  language_gap_detected: "Language proficiency gap identified",
  strong_job_match_found: "A well-matched job opportunity is available",
  high_compatibility_score: "High compatibility with job requirements",
};

export function buildReasonSummary(items: RecommendationItem[]): RecommendationReasonCode[] {
  const seen = new Set<string>();
  const result: RecommendationReasonCode[] = [];

  for (const item of items) {
    for (const code of item.reasonCodes) {
      if (!seen.has(code)) {
        seen.add(code);
        result.push({
          code,
          polarity: "recommendation",
          message: REASON_MESSAGES[code] ?? code,
        });
      }
    }
  }

  return result;
}
