/**
 * Intelligence Consumption Layer — Adapters
 *
 * Pure mapping functions that convert raw read-model snapshots
 * into UI-safe ConsumptionResult wrappers.
 *
 * Integrates freshness policy (Step 9D) for richer status classification.
 *
 * Adapters MUST NOT:
 * - Recompute scores or gaps
 * - Infer new recommendations
 * - Generate UI copy or labels
 * - Mutate persisted values
 *
 * Steps 8A + 9D — Consumption Adapters + Freshness Integration
 */

import type { SnapshotResult } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type {
  TeacherCriSnapshot,
  TeacherJobMatchSnapshot,
  TeacherGapSnapshot,
  TeacherRecommendationsSnapshot,
  RecommendationEntry,
  TeacherVerifiedStateSnapshot,
  SnapshotMeta,
} from "@/intelligence/read-models/types/intelligence-read-models.types";
import {
  resolveSnapshotFreshness,
  type IntelligenceSnapshotType,
} from "@/intelligence/freshness";
import { orderRecommendationsByPriority } from "@/intelligence/recommendations/ordering/recommendation-ordering";
import type {
  ConsumptionResult,
  ConsumptionMeta,
  ConsumptionStatus,
  CriConsumptionData,
  MatchConsumptionData,
  GapConsumptionData,
  RecommendationConsumptionData,
  VerifiedStateConsumptionData,
} from "../types/intelligence-consumption.types";
import { mapCriScoreToBand } from "@/intelligence/shared/cri-band.utils";

// ── Shared helpers ─────────────────────────────────────────────

function metaFromSnapshot(
  meta: SnapshotMeta | undefined,
  snapshotType: IntelligenceSnapshotType,
): ConsumptionMeta {
  const computedAt = meta?.computedAt ?? null;
  const dbStaleness = meta?.staleness ?? "fresh";

  // If DB explicitly marks as stale/expired, trust that over time-based check
  const freshness = dbStaleness === "stale" || dbStaleness === "expired"
    ? dbStaleness === "expired" ? "invalidated" : "stale"
    : resolveSnapshotFreshness(dbStaleness, computedAt, snapshotType);

  return {
    computedAt,
    freshnessStatus: freshness === "missing" ? "unknown"
      : freshness === "invalidated" ? "expired"
      : freshness === "recomputing" ? "stale"
      : freshness === "failed" ? "expired"
      : freshness,
    isStale: freshness === "stale" || freshness === "invalidated" || freshness === "failed",
    isInvalidated: freshness === "invalidated",
    isRecomputing: freshness === "recomputing",
    missingReason: null,
    triggeredByEvent: null,
    engineVersion: meta?.engineVersion ?? null,
    lastSuccessfulComputationAt: computedAt,
    lastFailureAt: null,
  };
}

function emptyMeta(reason: ConsumptionMeta["missingReason"] = "never_computed"): ConsumptionMeta {
  return {
    computedAt: null,
    freshnessStatus: "unknown",
    isStale: false,
    isInvalidated: false,
    isRecomputing: false,
    missingReason: reason,
    triggeredByEvent: null,
    engineVersion: null,
    lastSuccessfulComputationAt: null,
    lastFailureAt: null,
  };
}

function statusFromSnapshotResult<T>(
  result: SnapshotResult<T>,
  snapshotType: IntelligenceSnapshotType,
): ConsumptionStatus {
  if (result.status === "not_found") return "empty";
  // If the repository already classified it as stale, trust that
  if (result.status === "stale") return "stale";
  // Otherwise, apply time-based freshness check
  const meta = (result.data as Record<string, unknown> | null)?.meta as SnapshotMeta | undefined;
  const freshness = resolveSnapshotFreshness(
    meta?.staleness ?? "fresh",
    meta?.computedAt ?? null,
    snapshotType,
  );
  if (freshness === "fresh") return "ready";
  return "stale";
}

// ── CRI Adapter ────────────────────────────────────────────────

export function adaptCriSnapshot(
  result: SnapshotResult<TeacherCriSnapshot>,
): ConsumptionResult<CriConsumptionData> {
  if (result.status === "not_found") {
    return { status: "empty", data: null, metadata: emptyMeta() };
  }

  const snap = result.data;
  const score = snap.score;
  const band = mapCriScoreToBand(score);

  return {
    status: statusFromSnapshotResult(result, "cri"),
    data: {
      score,
      band,
      dimensions: snap.dimensions.map((d) => ({
        dimension: d.dimension,
        label: d.label,
        score: d.score,
        maxScore: d.maxScore,
        met: d.matched,
      })),
      gapTermIds: snap.gapTermIds,
      jobId: snap.jobId,
    },
    metadata: metaFromSnapshot(snap.meta, "cri"),
  };
}

// ── Match Adapter ──────────────────────────────────────────────

export function adaptMatchSnapshot(
  result: SnapshotResult<TeacherJobMatchSnapshot>,
): ConsumptionResult<MatchConsumptionData> {
  if (result.status === "not_found") {
    return { status: "empty", data: null, metadata: emptyMeta() };
  }

  const snap = result.data;
  return {
    status: statusFromSnapshotResult(result, "match"),
    data: {
      score: snap.score,
      confidence: snap.confidence,
      dimensions: snap.dimensions.map((d) => ({
        dimension: d.dimension,
        label: d.label,
        score: d.score,
        maxScore: d.maxScore,
        matched: d.matched,
        reason: d.reason,
      })),
      matchedTermIds: snap.matchedTermIds,
      unmatchedTermIds: snap.unmatchedTermIds,
      jobId: snap.jobId,
    },
    metadata: metaFromSnapshot(snap.meta, "match"),
  };
}

// ── Gap Adapter ────────────────────────────────────────────────

export function adaptGapSnapshot(
  result: SnapshotResult<TeacherGapSnapshot>,
): ConsumptionResult<GapConsumptionData> {
  if (result.status === "not_found") {
    return { status: "empty", data: null, metadata: emptyMeta() };
  }

  const snap = result.data;

  const categoryMap = new Map<string, { count: number; highestSeverity: string }>();
  const gaps = snap.gaps.map((g, i) => {
    const category = g.category ?? "other";
    const severity = g.severity ?? "medium";
    const entry = categoryMap.get(category) ?? { count: 0, highestSeverity: "low" };
    entry.count++;
    // Track highest severity per category
    const sevOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    if ((sevOrder[severity as keyof typeof sevOrder] ?? 2) > (sevOrder[entry.highestSeverity as keyof typeof sevOrder] ?? 1)) {
      entry.highestSeverity = severity;
    }
    categoryMap.set(category, entry);

    return {
      gapId: `gap-${snap.teacherId}-${i}`,
      gapType: category,
      label: g.label ?? g.termId ?? "Unknown gap",
      severity: severity as string,
      confidence: (g.confidence ?? "medium") as string,
      category,
      taxonomyTermId: g.termId,
      evidenceSources: [g.source ?? "profile_analysis"],
    };
  });

  const groupedSummary = Array.from(categoryMap.entries()).map(([category, info]) => ({
    category,
    count: info.count,
    highestSeverity: info.highestSeverity,
  }));

  return {
    status: statusFromSnapshotResult(result, "gap"),
    data: {
      gaps,
      totalGaps: snap.totalGaps,
      priorityGapIds: gaps.slice(0, 5).map((g) => g.gapId),
      groupedSummary,
      jobId: snap.jobId,
    },
    metadata: metaFromSnapshot(snap.meta, "gap"),
  };
}

// ── Recommendation Helpers ──────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function buildGroupedSummaryFromEntries(entries: RecommendationEntry[]): { groupKey: string; label: string; count: number; highestPriority: string }[] {
  const groups = new Map<string, { count: number; highestPriority: string }>();
  for (const e of entries) {
    const existing = groups.get(e.groupKey);
    if (!existing) {
      groups.set(e.groupKey, { count: 1, highestPriority: e.priority });
    } else {
      existing.count++;
      if ((PRIORITY_ORDER[e.priority] ?? 0) > (PRIORITY_ORDER[existing.highestPriority] ?? 0)) {
        existing.highestPriority = e.priority;
      }
    }
  }
  return Array.from(groups.entries()).map(([groupKey, v]) => ({
    groupKey,
    label: groupKey.replace(/_/g, " "),
    count: v.count,
    highestPriority: v.highestPriority,
  }));
}

// ── Recommendation Adapter ─────────────────────────────────────

export function adaptRecommendationSnapshot(
  result: SnapshotResult<TeacherRecommendationsSnapshot>,
): ConsumptionResult<RecommendationConsumptionData> {
  if (result.status === "not_found") {
    return { status: "empty", data: null, metadata: emptyMeta() };
  }

  const snap = result.data;
  const orderedRecs = orderRecommendationsByPriority(snap.recommendations);
  return {
    status: statusFromSnapshotResult(result, "recommendation"),
    data: {
      recommendations: orderedRecs.map((r) => ({
        recommendationId: r.recommendationId,
        type: r.recommendationType,
        targetId: r.itemId,
        priority: r.priority,
        confidence: r.confidence,
        reasonCodes: r.reasonCodes,
        relatedGapIds: r.addressesGapTermIds,
        groupKey: r.groupKey,
        actionLabelKey: r.actionLabelKey,
      })),
      topRecommendationIds: orderedRecs
        .slice(0, 5)
        .map((r) => r.recommendationId),
      totalCount: snap.totalCount,
      groupedSummary: buildGroupedSummaryFromEntries(orderedRecs),
    },
    metadata: metaFromSnapshot(snap.meta, "recommendation"),
  };
}

// ── Verified State Adapter ─────────────────────────────────────

export function adaptVerifiedStateSnapshot(
  result: SnapshotResult<TeacherVerifiedStateSnapshot>,
): ConsumptionResult<VerifiedStateConsumptionData> {
  if (result.status === "not_found") {
    return { status: "empty", data: null, metadata: emptyMeta() };
  }

  const snap = result.data;
  return {
    status: statusFromSnapshotResult(result, "verified_state"),
    data: {
      overallStatus: snap.overallStatus,
      credentials: snap.credentials.map((c) => ({
        termId: c.termId,
        credentialType: c.credentialType,
        verified: c.verified,
        verifiedAt: c.verifiedAt,
      })),
      verifiedCount: snap.verifiedCount,
      totalCount: snap.totalCount,
    },
    metadata: metaFromSnapshot(snap.meta, "verified_state"),
  };
}

// ── Error adapter ──────────────────────────────────────────────

export function errorResult<T>(errorMessage: string): ConsumptionResult<T> {
  return {
    status: "error",
    data: null,
    metadata: emptyMeta("fetch_failed"),
    error: errorMessage,
  };
}

export function loadingResult<T>(): ConsumptionResult<T> {
  return {
    status: "loading",
    data: null,
    metadata: emptyMeta(),
  };
}
