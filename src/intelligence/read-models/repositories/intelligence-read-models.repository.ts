/**
 * Intelligence Read Models — Repository
 *
 * Typed query surface for reading intelligence snapshots.
 * Returns cached/persisted snapshots — never computes scores.
 *
 * Phase 4: Real Supabase implementation reads from snapshot tables.
 *
 * Workstream 2B
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  TeacherCriSnapshot,
  TeacherJobMatchSnapshot,
  TeacherGapSnapshot,
  TeacherRecommendationsSnapshot,
  TeacherVerifiedStateSnapshot,
  CriDimensionScore,
  MatchDimensionScore,
  GapEntry,
  RecommendationEntry,
  VerifiedCredentialEntry,
  SnapshotStaleness,
} from "../types/intelligence-read-models.types";

// ── Result wrapper ─────────────────────────────────────────────

export type SnapshotResult<T> =
  | { status: "found"; data: T }
  | { status: "not_found" }
  | { status: "stale"; data: T };

// ── Helpers ────────────────────────────────────────────────────

function resolveStatus(staleness: string): "found" | "stale" {
  return staleness === "stale" || staleness === "expired" ? "stale" : "found";
}

function parseStaleness(raw: string | null): SnapshotStaleness {
  if (raw === "stale") return "stale";
  if (raw === "expired") return "expired";
  return "fresh";
}

/** Map engine RecommendationType strings to read-model entry types */
function mapRecommendationTypeToEntryType(
  recType: string,
): RecommendationEntry["type"] {
  if (recType.includes("course") || recType.includes("training") || recType === "training") return "training";
  if (recType.includes("pathway") || recType === "pathway") return "pathway";
  if (recType.includes("mentor") || recType === "mentor") return "mentor";
  if (recType.includes("job") || recType === "job") return "job";
  return "training";
}

// ── Batch result type ──────────────────────────────────────────

export type BatchSnapshotResult<T> = Record<string, SnapshotResult<T>>;

// ── Repository interface ───────────────────────────────────────

export interface IntelligenceReadModelRepository {
  // Single-teacher methods
  getTeacherCriSnapshot(teacherId: string, jobId: string): Promise<SnapshotResult<TeacherCriSnapshot>>;
  getTeacherJobMatchSnapshot(teacherId: string, jobId: string): Promise<SnapshotResult<TeacherJobMatchSnapshot>>;
  getTeacherGapSnapshot(teacherId: string): Promise<SnapshotResult<TeacherGapSnapshot>>;
  getTeacherRecommendationsSnapshot(teacherId: string): Promise<SnapshotResult<TeacherRecommendationsSnapshot>>;
  getTeacherVerifiedStateSnapshot(teacherId: string): Promise<SnapshotResult<TeacherVerifiedStateSnapshot>>;

  // Batch methods
  getVerifiedStateForTeachers(teacherIds: string[]): Promise<BatchSnapshotResult<TeacherVerifiedStateSnapshot>>;
  getVerifiedTeacherIds(overallStatus: string, limit?: number): Promise<string[]>;
}

// ── Real Supabase implementation ───────────────────────────────

export const supabaseRepository: IntelligenceReadModelRepository = {
  async getTeacherCriSnapshot(teacherId, jobId) {
    const { data, error } = await supabase
      .from("intelligence_cri_snapshots")
      .select("teacher_id, job_id, score, dimensions, gap_term_ids, staleness, computed_at, engine_version")
      .eq("teacher_id", teacherId)
      .eq("job_id", jobId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[ReadModel] CRI query error:", error.message);
      return { status: "not_found" };
    }
    if (!data) return { status: "not_found" };

    const snapshot: TeacherCriSnapshot = {
      teacherId: data.teacher_id,
      jobId: data.job_id,
      score: Number(data.score),
      dimensions: (Array.isArray(data.dimensions) ? data.dimensions : []) as unknown as CriDimensionScore[],
      gapTermIds: data.gap_term_ids ?? [],
      meta: {
        computedAt: data.computed_at,
        staleness: parseStaleness(data.staleness),
        engineVersion: data.engine_version ?? undefined,
      },
    };

    const status = resolveStatus(data.staleness);
    return { status, data: snapshot };
  },

  async getTeacherJobMatchSnapshot(teacherId, jobId) {
    const { data, error } = await supabase
      .from("intelligence_match_snapshots")
      .select("teacher_id, job_id, score, confidence, dimensions, matched_term_ids, unmatched_term_ids, staleness, computed_at, engine_version")
      .eq("teacher_id", teacherId)
      .eq("job_id", jobId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[ReadModel] Match query error:", error.message);
      return { status: "not_found" };
    }
    if (!data) return { status: "not_found" };

    const snapshot: TeacherJobMatchSnapshot = {
      teacherId: data.teacher_id,
      jobId: data.job_id,
      score: Number(data.score),
      confidence: (data.confidence ?? "medium") as "low" | "medium" | "high",
      dimensions: (Array.isArray(data.dimensions) ? data.dimensions : []) as unknown as MatchDimensionScore[],
      matchedTermIds: data.matched_term_ids ?? [],
      unmatchedTermIds: data.unmatched_term_ids ?? [],
      meta: {
        computedAt: data.computed_at,
        staleness: parseStaleness(data.staleness),
        engineVersion: data.engine_version ?? undefined,
      },
    };

    const status = resolveStatus(data.staleness);
    return { status, data: snapshot };
  },

  async getTeacherGapSnapshot(teacherId) {
    const { data, error } = await supabase
      .from("intelligence_gap_snapshots")
      .select("teacher_id, job_id, total_gaps, gaps, staleness, computed_at, engine_version")
      .eq("teacher_id", teacherId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[ReadModel] Gap query error:", error.message);
      return { status: "not_found" };
    }
    if (!data) return { status: "not_found" };

    const snapshot: TeacherGapSnapshot = {
      teacherId: data.teacher_id,
      jobId: data.job_id ?? undefined,
      gaps: (Array.isArray(data.gaps) ? data.gaps : []) as unknown as GapEntry[],
      totalGaps: data.total_gaps ?? 0,
      meta: {
        computedAt: data.computed_at,
        staleness: parseStaleness(data.staleness),
        engineVersion: data.engine_version ?? undefined,
      },
    };

    const status = resolveStatus(data.staleness);
    return { status, data: snapshot };
  },

  async getTeacherRecommendationsSnapshot(teacherId) {
    const { data, error } = await supabase
      .from("intelligence_recommendation_snapshots")
      .select("teacher_id, recommendations, total_count, staleness, computed_at, engine_version")
      .eq("teacher_id", teacherId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[ReadModel] Recommendation query error:", error.message);
      return { status: "not_found" };
    }
    if (!data) return { status: "not_found" };

    // The writer stores RecommendationItem[] directly as JSON array.
    // Map each item to the read-model RecommendationEntry shape.
    const rawRecs = Array.isArray(data.recommendations) ? data.recommendations : [];
    const mappedRecs: RecommendationEntry[] = rawRecs.map((r: unknown, idx: number) => {
      const rec = r as Record<string, unknown>;
      const reasonCodes = Array.isArray(rec.reasonCodes) ? rec.reasonCodes as string[] : [];
      return {
        recommendationId: (rec.recommendationId ?? `rec-${idx}`) as string,
        recommendationType: (rec.recommendationType ?? rec.type ?? "training") as string,
        type: mapRecommendationTypeToEntryType(rec.recommendationType as string ?? rec.type as string ?? "training"),
        itemId: (rec.targetId ?? rec.itemId ?? "") as string,
        priority: (rec.priority ?? "medium") as RecommendationEntry["priority"],
        confidence: (rec.confidence ?? "medium") as RecommendationEntry["confidence"],
        reason: reasonCodes.length > 0
          ? reasonCodes.join(", ")
          : (rec.actionLabelKey ?? rec.reason ?? "") as string,
        reasonCodes,
        actionLabelKey: (rec.actionLabelKey ?? `${rec.recommendationType ?? rec.type}_recommendation`) as string,
        groupKey: (rec.groupKey ?? "career_readiness_actions") as string,
        rank: idx + 1,
        addressesGapTermIds: (rec.relatedGapIds ?? rec.addressesGapTermIds ?? []) as string[],
        relatedTaxonomyTermIds: (rec.relatedTaxonomyTermIds ?? []) as string[],
      };
    });

    const snapshot: TeacherRecommendationsSnapshot = {
      teacherId: data.teacher_id,
      recommendations: mappedRecs,
      totalCount: data.total_count ?? 0,
      meta: {
        computedAt: data.computed_at,
        staleness: parseStaleness(data.staleness),
        engineVersion: data.engine_version ?? undefined,
      },
    };

    const status = resolveStatus(data.staleness);
    return { status, data: snapshot };
  },

  async getTeacherVerifiedStateSnapshot(teacherId) {
    const { data, error } = await supabase
      .from("intelligence_verified_state_snapshots")
      .select("teacher_id, overall_status, credentials, verified_count, total_count, staleness, computed_at, engine_version")
      .eq("teacher_id", teacherId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[ReadModel] VerifiedState query error:", error.message);
      return { status: "not_found" };
    }
    if (!data) return { status: "not_found" };

    const snapshot: TeacherVerifiedStateSnapshot = {
      teacherId: data.teacher_id,
      overallStatus: (data.overall_status ?? "none") as "none" | "partial" | "full",
      credentials: (Array.isArray(data.credentials) ? data.credentials : []) as unknown as VerifiedCredentialEntry[],
      verifiedCount: data.verified_count ?? 0,
      totalCount: data.total_count ?? 0,
      meta: {
        computedAt: data.computed_at,
        staleness: parseStaleness(data.staleness),
        engineVersion: data.engine_version ?? undefined,
      },
    };

    const status = resolveStatus(data.staleness);
    return { status, data: snapshot };
  },

  // ── Batch: verified state for multiple teachers ───────────────

  async getVerifiedStateForTeachers(teacherIds) {
    if (teacherIds.length === 0) return {};

    const { data, error } = await supabase
      .from("intelligence_verified_state_snapshots")
      .select("teacher_id, overall_status, credentials, verified_count, total_count, staleness, computed_at, engine_version")
      .in("teacher_id", teacherIds);

    if (error) {
      console.warn("[ReadModel] Batch VerifiedState query error:", error.message);
      return {};
    }

    // Group by teacher_id, take latest per teacher
    const byTeacher = new Map<string, typeof data[number]>();
    for (const row of data ?? []) {
      const existing = byTeacher.get(row.teacher_id);
      if (!existing || row.computed_at > existing.computed_at) {
        byTeacher.set(row.teacher_id, row);
      }
    }

    const result: BatchSnapshotResult<TeacherVerifiedStateSnapshot> = {};
    for (const tid of teacherIds) {
      const row = byTeacher.get(tid);
      if (!row) {
        result[tid] = { status: "not_found" };
        continue;
      }
      const snapshot: TeacherVerifiedStateSnapshot = {
        teacherId: row.teacher_id,
        overallStatus: (row.overall_status ?? "none") as "none" | "partial" | "full",
        credentials: (Array.isArray(row.credentials) ? row.credentials : []) as unknown as VerifiedCredentialEntry[],
        verifiedCount: row.verified_count ?? 0,
        totalCount: row.total_count ?? 0,
        meta: {
          computedAt: row.computed_at,
          staleness: parseStaleness(row.staleness),
          engineVersion: row.engine_version ?? undefined,
        },
      };
      const status = resolveStatus(row.staleness);
      result[tid] = { status, data: snapshot };
    }
    return result;
  },

  // ── Batch: get teacher IDs with specific verified status ─────

  async getVerifiedTeacherIds(overallStatus, limit = 500) {
    const { data, error } = await supabase
      .from("intelligence_verified_state_snapshots")
      .select("teacher_id")
      .eq("overall_status", overallStatus)
      .limit(limit);

    if (error) {
      console.warn("[ReadModel] VerifiedTeacherIds query error:", error.message);
      return [];
    }

    return (data ?? []).map((r) => r.teacher_id);
  },
};

// ── Stub implementation (kept for testing) ─────────────────────

export const stubRepository: IntelligenceReadModelRepository = {
  async getTeacherCriSnapshot() { return { status: "not_found" }; },
  async getTeacherJobMatchSnapshot() { return { status: "not_found" }; },
  async getTeacherGapSnapshot() { return { status: "not_found" }; },
  async getTeacherRecommendationsSnapshot() { return { status: "not_found" }; },
  async getTeacherVerifiedStateSnapshot() { return { status: "not_found" }; },
  async getVerifiedStateForTeachers() { return {}; },
  async getVerifiedTeacherIds() { return []; },
};

// ── Active repository (now defaults to real implementation) ────

let activeRepository: IntelligenceReadModelRepository = supabaseRepository;

export function setRepository(repo: IntelligenceReadModelRepository): void {
  activeRepository = repo;
}

export function getRepository(): IntelligenceReadModelRepository {
  return activeRepository;
}
