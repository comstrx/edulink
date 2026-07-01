/**
 * Recommendation Engine v1 — Core Engine
 *
 * Converts RecommendationEngineInput into RecommendationEngineResult.
 * Pure computation — no DB access, no side effects.
 *
 * Phase 7C — Live Implementation
 */

import type {
  RecommendationEngineInput,
  RecommendationEngineResult,
  RecommendationItem,
  RecommendationType,
  RecommendationGroupKey,
} from "./recommendation-engine.types";
import {
  computeRecommendationPriority,
  computeRecommendationConfidence,
  resolveGroupKey,
  ACTION_LABEL_KEYS,
  sortRecommendations,
  deduplicateRecommendations,
  groupSameTypeRecommendations,
  capPerActionType,
  buildGroupedSummary,
  buildReasonSummary,
} from "./recommendation-engine.rules";

const MAX_RECOMMENDATIONS = 12;
const MAX_TOP = 5;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

export function runRecommendationEngine(
  input: RecommendationEngineInput,
): RecommendationEngineResult {
  idCounter = 0;
  const now = new Date().toISOString();
  const candidates: RecommendationItem[] = [];

  // ── 1. Profile completion actions ────────────────────────────
  candidates.push(...generateProfileActions(input));

  // ── 2. Trust / verification actions ──────────────────────────
  candidates.push(...generateTrustActions(input));

  // ── 3. Gap-driven training & certification recommendations ──
  candidates.push(...generateGapDrivenRecommendations(input));

  // ── 4. Match-pattern-driven actions ──────────────────────────
  candidates.push(...generateMatchPatternActions(input));

  // ── 5. CRI-driven career readiness actions ───────────────────
  candidates.push(...generateCriActions(input));

  // ── 6. Job recommendations from match signals ────────────────
  candidates.push(...generateJobRecommendations(input));

  // ── Deduplicate, group same-type, sort, cap, trim ─────────────
  const deduped = deduplicateRecommendations(candidates);
  const grouped = groupSameTypeRecommendations(deduped);

  // If severe foundational blockers exist, demote non-foundational low-priority items
  const hasFoundationalBlocker = grouped.some(
    (r) =>
      (r.recommendationType === "profile_completion_action" ||
        r.recommendationType === "verification_action") &&
      (r.priority === "critical" || r.priority === "high"),
  );

  let final = sortRecommendations(grouped);

  // Cap per action type (applied after sort so highest-priority survive)
  final = capPerActionType(final);

  if (hasFoundationalBlocker) {
    // Keep foundational items, limit content items to avoid overwhelming
    const foundational = final.filter(
      (r) =>
        r.recommendationType === "profile_completion_action" ||
        r.recommendationType === "verification_action",
    );
    const content = final.filter(
      (r) =>
        r.recommendationType !== "profile_completion_action" &&
        r.recommendationType !== "verification_action",
    );
    final = [...foundational, ...content.slice(0, Math.max(0, MAX_RECOMMENDATIONS - foundational.length))];
  } else {
    final = final.slice(0, MAX_RECOMMENDATIONS);
  }

  const topRecommendationIds = final.slice(0, MAX_TOP).map((r) => r.recommendationId);

  return {
    teacherId: input.teacherId,
    recommendations: final,
    topRecommendationIds,
    groupedRecommendationSummary: buildGroupedSummary(final),
    recommendationReasonSummary: buildReasonSummary(final),
    reasonCodes: buildReasonSummary(final),
    generatedAt: now,
    triggeredByEvent: input.metadata.triggeredByEvent,
    freshness: { isStale: false, freshnessStatus: "fresh" },
  };
}

// ── Generators ─────────────────────────────────────────────────

function makeItem(
  type: RecommendationType,
  opts: {
    targetId?: string;
    gapSeverity?: string;
    isFoundational?: boolean;
    evidenceCount?: number;
    hasCatalogMatch?: boolean;
    reasonCodes: string[];
    relatedGapIds?: string[];
    relatedTermIds?: string[];
    groupOverride?: RecommendationGroupKey;
  },
): RecommendationItem {
  return {
    recommendationId: nextId("rec"),
    recommendationType: type,
    targetId: opts.targetId,
    priority: computeRecommendationPriority(opts.gapSeverity, opts.isFoundational, opts.evidenceCount),
    confidence: computeRecommendationConfidence(opts.evidenceCount ?? 1, opts.hasCatalogMatch),
    reasonCodes: opts.reasonCodes,
    relatedGapIds: opts.relatedGapIds ?? [],
    relatedTaxonomyTermIds: opts.relatedTermIds ?? [],
    actionLabelKey: ACTION_LABEL_KEYS[type],
    groupKey: opts.groupOverride ?? resolveGroupKey(type),
  };
}

function generateProfileActions(input: RecommendationEngineInput): RecommendationItem[] {
  const { missingCoreProfileFields, profileCompletenessScore } = input.profileSignals;
  if (missingCoreProfileFields.length === 0) return [];

  // Severity based on how incomplete the profile is
  const severity =
    profileCompletenessScore < 30 ? "critical" :
    profileCompletenessScore < 60 ? "high" : "medium";

  return [
    makeItem("profile_completion_action", {
      gapSeverity: severity,
      isFoundational: true,
      evidenceCount: missingCoreProfileFields.length,
      reasonCodes: ["profile_incomplete"],
      relatedGapIds: [],
      relatedTermIds: [],
    }),
  ];
}

function generateTrustActions(input: RecommendationEngineInput): RecommendationItem[] {
  const { identityVerified, educationVerified, experienceVerified, credentialVerified } = input.trustSignals;
  const items: RecommendationItem[] = [];

  const unverified: string[] = [];
  if (!identityVerified) unverified.push("identity");
  if (!educationVerified) unverified.push("education");
  if (!experienceVerified) unverified.push("experience");
  if (!credentialVerified) unverified.push("credential");

  if (unverified.length === 0) return [];

  // Single aggregated verification action
  items.push(
    makeItem("verification_action", {
      gapSeverity: unverified.length >= 3 ? "high" : "medium",
      isFoundational: true,
      evidenceCount: unverified.length,
      reasonCodes: ["verification_missing"],
      relatedGapIds: [],
      relatedTermIds: [],
    }),
  );

  return items;
}

function generateGapDrivenRecommendations(input: RecommendationEngineInput): RecommendationItem[] {
  const { gapItems } = input.gapSignals;
  const { mappedTrainingByTaxonomyTerm, certificationPreparationOffers } = input.trainingCatalogSignals;
  const items: RecommendationItem[] = [];

  for (const gap of gapItems) {
    const termId = gap.taxonomyTermId;

    // Certification gaps → certification recommendation
    if (gap.gapType === "certification_gap") {
      const hasCertPrep = certificationPreparationOffers.length > 0;
      const catalogItemId = termId ? mappedTrainingByTaxonomyTerm[termId]?.[0] : undefined;
      items.push(
        makeItem("certification_recommendation", {
          targetId: catalogItemId,
          gapSeverity: gap.severity,
          evidenceCount: gap.evidenceSources.length,
          hasCatalogMatch: hasCertPrep || !!catalogItemId,
          reasonCodes: ["missing_required_certification", ...(catalogItemId ? ["strong_catalog_match_found"] : [])],
          relatedGapIds: [gap.gapId],
          relatedTermIds: termId ? [termId] : [],
        }),
      );
      continue;
    }

    // Curriculum gaps → curriculum alignment action
    if (gap.gapType === "curriculum_gap") {
      items.push(
        makeItem("curriculum_alignment_action", {
          gapSeverity: gap.severity,
          evidenceCount: gap.evidenceSources.length,
          reasonCodes: ["repeated_curriculum_mismatch"],
          relatedGapIds: [gap.gapId],
          relatedTermIds: termId ? [termId] : [],
        }),
      );
      continue;
    }

    // Language gaps → language improvement
    if (gap.gapType === "language_gap") {
      items.push(
        makeItem("language_improvement_action", {
          gapSeverity: gap.severity,
          evidenceCount: gap.evidenceSources.length,
          reasonCodes: ["language_gap_detected"],
          relatedGapIds: [gap.gapId],
          relatedTermIds: termId ? [termId] : [],
        }),
      );
      continue;
    }

    // Experience gaps → experience building
    if (gap.gapType === "experience_gap") {
      items.push(
        makeItem("experience_building_action", {
          gapSeverity: gap.severity,
          evidenceCount: gap.evidenceSources.length,
          reasonCodes: ["experience_gap_detected"],
          relatedGapIds: [gap.gapId],
          relatedTermIds: termId ? [termId] : [],
        }),
      );
      continue;
    }

    // Training gaps → course recommendation if catalog match exists
    if (gap.gapType === "training_gap" && termId) {
      const catalogItem = mappedTrainingByTaxonomyTerm[termId]?.[0];
      if (catalogItem) {
        items.push(
          makeItem("course_recommendation", {
            targetId: catalogItem,
            gapSeverity: gap.severity,
            evidenceCount: gap.evidenceSources.length,
            hasCatalogMatch: true,
            reasonCodes: ["weak_training_foundation", "strong_catalog_match_found"],
            relatedGapIds: [gap.gapId],
            relatedTermIds: [termId],
          }),
        );
      }
      continue;
    }

    // Subject/other gaps with catalog match → course recommendation
    if (termId && mappedTrainingByTaxonomyTerm[termId]?.length) {
      items.push(
        makeItem("course_recommendation", {
          targetId: mappedTrainingByTaxonomyTerm[termId][0],
          gapSeverity: gap.severity,
          evidenceCount: gap.evidenceSources.length,
          hasCatalogMatch: true,
          reasonCodes: ["strong_catalog_match_found"],
          relatedGapIds: [gap.gapId],
          relatedTermIds: [termId],
        }),
      );
    }
  }

  return items;
}

function generateMatchPatternActions(input: RecommendationEngineInput): RecommendationItem[] {
  const { repeatedMatchGapPatterns } = input.matchSignals;
  const { mappedTrainingByTaxonomyTerm } = input.trainingCatalogSignals;
  if (repeatedMatchGapPatterns.length === 0) return [];

  const items: RecommendationItem[] = [];

  // Only generate for patterns not already covered by gap items
  const coveredTermIds = new Set(
    input.gapSignals.gapItems
      .filter((g) => g.taxonomyTermId)
      .map((g) => g.taxonomyTermId!),
  );

  for (const termId of repeatedMatchGapPatterns) {
    if (coveredTermIds.has(termId)) continue;

    const catalogItem = mappedTrainingByTaxonomyTerm[termId]?.[0];
    if (catalogItem) {
      items.push(
        makeItem("course_recommendation", {
          targetId: catalogItem,
          gapSeverity: "medium",
          evidenceCount: 2, // repeated = at least 2 match snapshots
          hasCatalogMatch: true,
          reasonCodes: ["repeated_curriculum_mismatch", "strong_catalog_match_found"],
          relatedGapIds: [],
          relatedTermIds: [termId],
        }),
      );
    } else {
      items.push(
        makeItem("curriculum_alignment_action", {
          gapSeverity: "medium",
          evidenceCount: 2,
          reasonCodes: ["repeated_curriculum_mismatch"],
          relatedGapIds: [],
          relatedTermIds: [termId],
        }),
      );
    }
  }

  return items;
}

function generateCriActions(input: RecommendationEngineInput): RecommendationItem[] {
  const { criScore, criBand, componentScores } = input.criSignals;
  if (criScore >= 60) return []; // strong/highly_ready — no CRI-driven actions

  const items: RecommendationItem[] = [];

  // Find unmet CRI components that aren't already covered
  const unmetComponents = componentScores.filter((c) => !c.met);
  const hasTrainingGap = unmetComponents.some((c) => c.component === "training");

  if (hasTrainingGap && input.trainingCatalogSignals.availableCourseIds.length > 0) {
    items.push(
      makeItem("course_recommendation", {
        gapSeverity: criBand === "not_ready" ? "high" : "medium",
        evidenceCount: 1,
        hasCatalogMatch: true,
        reasonCodes: ["low_cri_score", "weak_training_foundation"],
        relatedGapIds: [],
        relatedTermIds: [],
      }),
    );
  }

  return items;
}

// ── 6. Job Recommendations ─────────────────────────────────────

const MIN_JOB_MATCH_SCORE = 40;
const MAX_JOB_RECOMMENDATIONS = 3;

function generateJobRecommendations(input: RecommendationEngineInput): RecommendationItem[] {
  const { recentMatchScores } = input.matchSignals;
  if (recentMatchScores.length === 0) return [];

  const items: RecommendationItem[] = [];

  // Sort by score descending and pick top matches above threshold
  const eligible = [...recentMatchScores]
    .filter((m) => m.score >= MIN_JOB_MATCH_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_JOB_RECOMMENDATIONS);

  for (const match of eligible) {
    const severity = match.score >= 70 ? "high" : match.score >= 55 ? "medium" : "low";
    const reasonCodes = ["strong_job_match_found"];
    if (match.score >= 70) reasonCodes.push("high_compatibility_score");

    items.push(
      makeItem("job_recommendation", {
        targetId: match.jobId,
        gapSeverity: severity,
        evidenceCount: 1,
        reasonCodes,
        relatedGapIds: [],
        relatedTermIds: [],
        groupOverride: "job_actions",
      }),
    );
  }

  return items;
}
