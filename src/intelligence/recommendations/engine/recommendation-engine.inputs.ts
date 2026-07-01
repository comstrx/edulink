/**
 * Recommendation Engine v1 — Input Normalization
 *
 * Gathers signals from intelligence snapshots, teacher profile,
 * verified state, and training catalog to produce a stable
 * RecommendationEngineInput.
 *
 * Phase 7B — Live Implementation
 */

import type {
  RecommendationEngineInput,
  RecCriSignals,
  RecGapSignals,
  RecMatchSignals,
  RecTrustSignals,
  RecProfileSignals,
  RecTrainingCatalogSignals,
  RecRuntimeSignals,
} from "./recommendation-engine.types";
import type {
  RecommendationRawData,
  RawCriSnapshot,
  RawGapSnapshot,
  RawMatchSnapshot,
  RawVerifiedState,
  RawTeacherProfile,
  RawTrainingItem,
} from "./recommendation-data-loader";
import { loadRecommendationRawData } from "./recommendation-data-loader";
import { mapCriScoreToBand } from "@/intelligence/shared/cri-band.utils";

const arr = (v: string[] | null | undefined): string[] => v ?? [];

// ── Public API ─────────────────────────────────────────────────

export async function buildRecommendationEngineInput(
  teacherId: string,
  context?: { triggeredByEvent?: string; triggeredAt?: string },
): Promise<RecommendationEngineInput> {
  const rawData = await loadRecommendationRawData(teacherId);
  return assembleRecommendationInputFromRaw(teacherId, rawData, context);
}

/**
 * Pure function — testable without DB.
 */
export function assembleRecommendationInputFromRaw(
  teacherId: string,
  raw: RecommendationRawData,
  context?: { triggeredByEvent?: string; triggeredAt?: string },
): RecommendationEngineInput {
  const sourceHints: Record<string, string> = {};
  if (raw.criSnapshot) sourceHints.cri = raw.criSnapshot.computed_at;
  if (raw.gapSnapshot) sourceHints.gap = raw.gapSnapshot.computed_at;
  if (raw.matchSnapshots.length > 0) sourceHints.match = raw.matchSnapshots[0].computed_at;

  return {
    teacherId,
    criSignals: deriveCriSignals(raw.criSnapshot),
    gapSignals: deriveGapSignals(raw.gapSnapshot),
    matchSignals: deriveMatchSignals(raw.matchSnapshots),
    trustSignals: deriveTrustSignals(raw.verifiedState),
    profileSignals: deriveProfileSignals(raw.teacherProfile),
    trainingCatalogSignals: deriveTrainingCatalogSignals(raw.trainingCatalog),
    runtimeSignals: deriveRuntimeSignals(raw),
    metadata: {
      triggeredByEvent: context?.triggeredByEvent,
      triggeredAt: context?.triggeredAt ?? new Date().toISOString(),
      sourceUpdatedAtHints: Object.keys(sourceHints).length > 0 ? sourceHints : undefined,
    },
  };
}

// ── CRI ────────────────────────────────────────────────────────

function deriveCriSignals(cri: RawCriSnapshot | null): RecCriSignals {
  if (!cri) {
    return { criScore: 0, criBand: "not_ready", componentScores: [], reasonCodes: [] };
  }

  const dims = Array.isArray(cri.dimensions) ? cri.dimensions : [];
  const componentScores = dims.map((d: Record<string, unknown>) => ({
    component: String(d.component ?? d.dimension ?? ""),
    score: Number(d.score ?? 0),
    maxScore: Number(d.maxScore ?? d.max_score ?? 0),
    met: Boolean(d.met ?? d.matched ?? false),
  }));

  // Use canonical band mapping
  const band = mapCriScoreToBand(cri.score);

  return {
    criScore: cri.score,
    criBand: band,
    componentScores,
    reasonCodes: [],
  };
}

// ── Gaps ───────────────────────────────────────────────────────

interface RawGapItem {
  gapId?: string;
  gap_id?: string;
  gapType?: string;
  gap_type?: string;
  taxonomyTermId?: string;
  taxonomy_term_id?: string;
  label?: string;
  severity?: string;
  confidence?: string;
  evidenceSources?: string[];
  evidence_sources?: string[];
}

function deriveGapSignals(gap: RawGapSnapshot | null): RecGapSignals {
  if (!gap) {
    return { gapItems: [], priorityGapIds: [], groupedGapSummary: [] };
  }

  const rawGaps = Array.isArray(gap.gaps) ? (gap.gaps as RawGapItem[]) : [];

  const gapItems = rawGaps.map((g) => ({
    gapId: g.gapId ?? g.gap_id ?? "",
    gapType: g.gapType ?? g.gap_type ?? "",
    taxonomyTermId: g.taxonomyTermId ?? g.taxonomy_term_id,
    label: g.label ?? "",
    severity: g.severity ?? "low",
    confidence: g.confidence ?? "low",
    evidenceSources: g.evidenceSources ?? g.evidence_sources ?? [],
  }));

  // Priority: high/critical severity first
  const priorityGapIds = gapItems
    .filter((g) => g.severity === "critical" || g.severity === "high")
    .map((g) => g.gapId);

  // Grouped summary
  const groups = new Map<string, { count: number; highestSeverity: string }>();
  const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

  for (const g of gapItems) {
    const existing = groups.get(g.gapType);
    if (!existing) {
      groups.set(g.gapType, { count: 1, highestSeverity: g.severity });
    } else {
      existing.count++;
      if ((sevRank[g.severity] ?? 0) > (sevRank[existing.highestSeverity] ?? 0)) {
        existing.highestSeverity = g.severity;
      }
    }
  }

  const groupedGapSummary = Array.from(groups.entries()).map(([category, v]) => ({
    category,
    count: v.count,
    highestSeverity: v.highestSeverity,
  }));

  return { gapItems, priorityGapIds, groupedGapSummary };
}

// ── Match ──────────────────────────────────────────────────────

function deriveMatchSignals(snapshots: RawMatchSnapshot[]): RecMatchSignals {
  if (snapshots.length === 0) {
    return {
      recentMatchScores: [],
      recentMatchBands: [],
      repeatedMatchGapPatterns: [],
      recentEligibilityFlags: [],
    };
  }

  const recentMatchScores = snapshots.map((s) => ({ jobId: s.job_id, score: s.score }));

  const recentMatchBands = snapshots.map((s) => {
    if (s.score >= 80) return "strong";
    if (s.score >= 60) return "good";
    if (s.score >= 40) return "partial";
    return "weak";
  });

  // Repeated gap patterns: unmatched term IDs that appear in 2+ match snapshots
  const termFrequency = new Map<string, number>();
  for (const s of snapshots) {
    for (const termId of s.unmatched_term_ids ?? []) {
      termFrequency.set(termId, (termFrequency.get(termId) ?? 0) + 1);
    }
  }
  const repeatedMatchGapPatterns = Array.from(termFrequency.entries())
    .filter(([, count]) => count >= 2)
    .map(([termId]) => termId);

  const recentEligibilityFlags = snapshots.map((s) => ({
    jobId: s.job_id,
    eligible: s.score >= 40,
  }));

  return { recentMatchScores, recentMatchBands, repeatedMatchGapPatterns, recentEligibilityFlags };
}

// ── Trust ──────────────────────────────────────────────────────

interface RawCredentialEntry {
  credentialType?: string;
  credential_type?: string;
  verified?: boolean;
}

function deriveTrustSignals(verified: RawVerifiedState | null): RecTrustSignals {
  if (!verified) {
    return { identityVerified: false, educationVerified: false, experienceVerified: false, credentialVerified: false };
  }

  const creds = Array.isArray(verified.credentials) ? (verified.credentials as RawCredentialEntry[]) : [];

  const byType = (type: string) =>
    creds.some((c) => (c.credentialType === type || c.credential_type === type) && c.verified);

  return {
    identityVerified: verified.overall_status === "full" || byType("identity"),
    educationVerified: byType("degree"),
    experienceVerified: byType("experience"),
    credentialVerified: byType("certification") || byType("license"),
  };
}

// ── Profile ────────────────────────────────────────────────────

function deriveProfileSignals(profile: RawTeacherProfile | null): RecProfileSignals {
  if (!profile) {
    return {
      profileCompletenessScore: 0,
      missingCoreProfileFields: ["full_profile"],
      subjectMappings: [],
      curriculumMappings: [],
      gradeBandMappings: [],
    };
  }

  const missing: string[] = [];
  const checks: [boolean, string][] = [
    [!!profile.bio, "bio"],
    [!!profile.avatar_url, "avatar"],
    [!!profile.contact_email, "contact_email"],
    [!!profile.cv_url, "cv"],
    [arr(profile.subject_ids).length > 0, "subjects"],
    [arr(profile.curriculum_ids).length > 0, "curriculum"],
    [arr(profile.grade_band_ids).length > 0, "grade_bands"],
    [!!profile.country_id, "location"],
    [Array.isArray(profile.experience) && (profile.experience as unknown[]).length > 0, "experience"],
    [Array.isArray(profile.education) && (profile.education as unknown[]).length > 0, "education"],
    [arr(profile.language_ids).length > 0, "languages"],
  ];

  let filled = 0;
  for (const [present, field] of checks) {
    if (present) filled++;
    else missing.push(field);
  }

  const score = checks.length > 0 ? Math.round((filled / checks.length) * 100) : 0;

  return {
    profileCompletenessScore: score,
    missingCoreProfileFields: missing,
    subjectMappings: arr(profile.subject_ids),
    curriculumMappings: arr(profile.curriculum_ids),
    gradeBandMappings: arr(profile.grade_band_ids),
  };
}

// ── Training Catalog ───────────────────────────────────────────

function deriveTrainingCatalogSignals(catalog: RawTrainingItem[]): RecTrainingCatalogSignals {
  if (catalog.length === 0) {
    return {
      availableCourseIds: [],
      availablePathwayIds: [],
      mappedTrainingByTaxonomyTerm: {},
      certificationPreparationOffers: [],
    };
  }

  const courseIds: string[] = [];
  const pathwayIds: string[] = [];
  const certPrepIds: string[] = [];
  const termMap: Record<string, string[]> = {};

  const addToTermMap = (termId: string, itemId: string) => {
    if (!termMap[termId]) termMap[termId] = [];
    termMap[termId].push(itemId);
  };

  for (const item of catalog) {
    if (item.type === "course") courseIds.push(item.id);
    else if (item.type === "pathway") pathwayIds.push(item.id);

    if (item.credential_eligible) certPrepIds.push(item.id);

    for (const id of arr(item.subject_term_ids)) addToTermMap(id, item.id);
    for (const id of arr(item.skill_term_ids)) addToTermMap(id, item.id);
    for (const id of arr(item.curriculum_term_ids)) addToTermMap(id, item.id);
  }

  return {
    availableCourseIds: courseIds,
    availablePathwayIds: pathwayIds,
    mappedTrainingByTaxonomyTerm: termMap,
    certificationPreparationOffers: certPrepIds,
  };
}

// ── Runtime Signals (v2) ───────────────────────────────────────

function deriveRuntimeSignals(raw: RecommendationRawData): RecRuntimeSignals {
  // v2: Runtime signals are loaded from additional raw data fields
  // For now, produce empty defaults — the data loader will populate these
  return {
    activePathways: (raw.activePathways ?? []).map((p: Record<string, unknown>) => ({
      pathwayId: String(p.pathway_id ?? ""),
      progressPercent: Number(p.progress_percent ?? 0),
      title: String(p.pathway_title ?? ""),
    })),
    executionsMissingEvidence: (raw.executionsMissingEvidence ?? []).map((e: Record<string, unknown>) => ({
      executionId: String(e.id ?? ""),
      itemTitle: String(e.item_title ?? ""),
    })),
    evidenceNeedingRevision: (raw.evidenceNeedingRevision ?? []).map((e: Record<string, unknown>) => ({
      evidenceId: String(e.id ?? ""),
      executionId: String(e.execution_id ?? ""),
      title: String(e.title ?? ""),
    })),
    evidencePendingReview: (raw.evidencePendingReview ?? []).map((e: Record<string, unknown>) => ({
      evidenceId: String(e.id ?? ""),
      executionId: String(e.execution_id ?? ""),
      title: String(e.title ?? ""),
    })),
    completionsWithoutVerification: (raw.completionsWithoutVerification ?? []).map((c: Record<string, unknown>) => ({
      executionId: String(c.execution_id ?? ""),
      itemTitle: String(c.item_title ?? ""),
    })),
    rejectionReasonTermIds: raw.rejectionReasonTermIds ?? [],
    completedItemIds: raw.completedItemIds ?? [],
    pathwayCriTargets: (raw.pathwayCriTargets ?? []).map((t: Record<string, unknown>) => ({
      pathwayId: String(t.pathway_id ?? ""),
      criTarget: Number(t.cri_target ?? 0),
    })),
  };
}
