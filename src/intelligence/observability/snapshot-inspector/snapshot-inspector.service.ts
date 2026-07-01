/**
 * Snapshot Inspector Service
 *
 * Queries all intelligence snapshots for a teacher and returns
 * a unified inspection with freshness metadata and recompute hints.
 *
 * Developer/debug use only — not for UI consumption.
 *
 * Phase 10A.2
 */

import { supabase } from "@/integrations/supabase/client";
import type { IntelligenceSnapshotType } from "@/intelligence/freshness/types/freshness.types";
import type { InvalidationStrength } from "@/intelligence/freshness/policies/invalidation-matrix";
import type {
  TeacherSnapshotInspection,
  InspectedSnapshot,
  InspectedFreshness,
  InspectedRecomputeHint,
} from "./snapshot-inspector.types";

type FreshnessStatus = "fresh" | "stale" | "invalidated" | "missing" | "recomputing" | "failed";

function buildFreshness(row: Record<string, any> | null): InspectedFreshness {
  if (!row) {
    return {
      status: "missing",
      computedAt: null,
      invalidatedAt: null,
      staleReasonCodes: [],
      lastSuccessfulComputationAt: null,
    };
  }

  const staleness = row.staleness as string;
  let status: FreshnessStatus = "fresh";
  if (staleness === "stale") status = "stale";
  else if (staleness === "invalidated") status = "invalidated";
  else if (staleness === "recomputing") status = "recomputing";
  else if (staleness === "failed") status = "failed";

  return {
    status,
    computedAt: row.computed_at ?? null,
    invalidatedAt: staleness === "invalidated" ? (row.updated_at ?? null) : null,
    staleReasonCodes: [],
    lastSuccessfulComputationAt: staleness === "fresh" ? (row.computed_at ?? null) : null,
  };
}

function buildRecomputeHints(
  freshness: InspectedFreshness,
  snapshotType: IntelligenceSnapshotType,
): InspectedRecomputeHint {
  const needsRecompute = freshness.status !== "fresh" && freshness.status !== "missing";

  // Downstream targets that should also refresh
  const downstreamMap: Record<IntelligenceSnapshotType, IntelligenceSnapshotType[]> = {
    verified_state: ["cri", "recommendation"],
    cri: ["recommendation"],
    match: ["gap", "recommendation"],
    gap: ["recommendation"],
    recommendation: [],
  };

  const strength: InvalidationStrength | null = needsRecompute
    ? freshness.status === "invalidated" ? "strong" : "soft"
    : null;

  return {
    recommendedRecomputeTargets: needsRecompute
      ? [snapshotType, ...downstreamMap[snapshotType]]
      : [],
    invalidationStrength: strength,
    lastTriggerEvent: null, // Not stored in current schema
  };
}

function toInspected(
  snapshotType: IntelligenceSnapshotType,
  row: Record<string, any> | null,
): InspectedSnapshot {
  const freshness = buildFreshness(row);
  return {
    snapshotType,
    exists: row !== null,
    data: row ? (({ id, teacher_id, created_at, updated_at, staleness, engine_version, computed_at, ...rest }) => rest)(row) : null,
    freshness,
    recomputeHints: buildRecomputeHints(freshness, snapshotType),
    engineVersion: row?.engine_version ?? null,
    snapshotId: row?.id ?? null,
  };
}

/**
 * Inspect all intelligence snapshots for a given teacher.
 */
export async function inspectTeacherSnapshots(
  teacherId: string,
): Promise<TeacherSnapshotInspection> {
  const now = new Date().toISOString();

  // Fetch all snapshot types in parallel
  const [criRes, matchRes, gapRes, recRes, verifiedRes] = await Promise.all([
    supabase
      .from("intelligence_cri_snapshots")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("intelligence_match_snapshots")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(10),

    supabase
      .from("intelligence_gap_snapshots")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("intelligence_recommendation_snapshots")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("intelligence_verified_state_snapshots")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("staleness", "fresh")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const cri = toInspected("cri", criRes.data ?? null);
  const matchRows = (matchRes.data ?? []) as Record<string, any>[];
  const matchSnapshots = matchRows.length > 0
    ? matchRows.map((r) => toInspected("match", r))
    : [toInspected("match", null)];
  const gap = toInspected("gap", gapRes.data ?? null);
  const recommendation = toInspected("recommendation", recRes.data ?? null);
  const verifiedState = toInspected("verified_state", verifiedRes.data ?? null);

  // Summary
  const all = [cri, ...matchSnapshots, gap, recommendation, verifiedState];
  const freshCount = all.filter((s) => s.freshness.status === "fresh").length;
  const staleCount = all.filter((s) => s.freshness.status === "stale").length;
  const missingCount = all.filter((s) => s.freshness.status === "missing").length;
  const invalidatedCount = all.filter((s) => s.freshness.status === "invalidated").length;

  console.debug("[SnapshotInspector] Inspection complete", {
    teacherId,
    total: all.length,
    fresh: freshCount,
    stale: staleCount,
    missing: missingCount,
  });

  return {
    teacherId,
    inspectedAt: now,
    snapshots: {
      cri,
      match: matchSnapshots,
      gap,
      recommendation,
      verifiedState,
    },
    summary: {
      totalSnapshots: all.length,
      freshCount,
      staleCount,
      missingCount,
      invalidatedCount,
    },
  };
}
