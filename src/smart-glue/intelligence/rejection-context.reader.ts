/**
 * Rejection Intelligence Context Reader — Sprint 9
 *
 * Reads existing intelligence snapshots for a teacher being rejected,
 * providing decision context to Smart Glue rules.
 *
 * Pure read-only. No mutations. No scoring.
 */

import { supabaseRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type { SnapshotResult } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type {
  TeacherGapSnapshot,
  TeacherRecommendationsSnapshot,
  TeacherCriSnapshot,
  GapEntry,
} from "@/intelligence/read-models/types/intelligence-read-models.types";

// ── Context Shape ──────────────────────────────────────────────

export interface RejectionIntelligenceContext {
  /** Whether intelligence data was available */
  hasIntelligence: boolean;

  /** Gap snapshot summary */
  gaps: {
    available: boolean;
    totalGaps: number;
    topGaps: GapEntry[];
    categories: string[];
  };

  /** Recommendation snapshot summary */
  recommendations: {
    available: boolean;
    totalCount: number;
    hasExistingRecommendations: boolean;
  };

  /** CRI snapshot summary (if job-scoped) */
  cri: {
    available: boolean;
    score: number | null;
    gapTermIds: string[];
  };
}

const EMPTY_CONTEXT: RejectionIntelligenceContext = {
  hasIntelligence: false,
  gaps: { available: false, totalGaps: 0, topGaps: [], categories: [] },
  recommendations: { available: false, totalCount: 0, hasExistingRecommendations: false },
  cri: { available: false, score: null, gapTermIds: [] },
};

// ── Reader ─────────────────────────────────────────────────────

/**
 * Read intelligence context for a teacher being rejected from a job.
 * Returns a structured summary of existing intelligence state.
 *
 * Fire-and-forget safe: errors return empty context, never throw.
 */
export async function readRejectionContext(
  teacherId: string,
  jobId: string,
): Promise<RejectionIntelligenceContext> {
  try {
    console.debug("[IntelDecision]", JSON.stringify({ stage: "rule", engine: "context-reader", event: "rejection_context_read", teacherId, jobId }));

    // Read all three snapshots in parallel
    const [gapResult, recResult, criResult] = await Promise.all([
      supabaseRepository.getTeacherGapSnapshot(teacherId),
      supabaseRepository.getTeacherRecommendationsSnapshot(teacherId),
      supabaseRepository.getTeacherCriSnapshot(teacherId, jobId),
    ]);

    const gaps = extractGapContext(gapResult);
    const recommendations = extractRecommendationContext(recResult);
    const cri = extractCriContext(criResult);

    const hasIntelligence = gaps.available || recommendations.available || cri.available;

    console.debug("[IntelDecision]", JSON.stringify({ stage: "rule", engine: "context-reader", event: "rejection_context_loaded", hasIntelligence, totalGaps: gaps.totalGaps, criScore: cri.score }));

    return { hasIntelligence, gaps, recommendations, cri };
  } catch (err) {
    console.warn("[SmartGlue:Intel] Failed to read rejection context, using empty:", err);
    return EMPTY_CONTEXT;
  }
}

// ── Extractors ─────────────────────────────────────────────────

function extractGapContext(
  result: SnapshotResult<TeacherGapSnapshot>,
): RejectionIntelligenceContext["gaps"] {
  if (result.status === "not_found") {
    return { available: false, totalGaps: 0, topGaps: [], categories: [] };
  }

  const data = result.data;
  const categories = [...new Set(data.gaps.map((g) => g.category))];

  // Top 5 gaps prioritized by category importance
  const categoryPriority: Record<string, number> = {
    certification: 6, subject: 5, curriculum: 4, skill: 3, language: 2, experience: 1, location: 0, other: 0,
  };
  const sorted = [...data.gaps].sort(
    (a, b) => (categoryPriority[b.category] ?? 0) - (categoryPriority[a.category] ?? 0),
  );

  return {
    available: true,
    totalGaps: data.totalGaps,
    topGaps: sorted.slice(0, 5),
    categories,
  };
}

function extractRecommendationContext(
  result: SnapshotResult<TeacherRecommendationsSnapshot>,
): RejectionIntelligenceContext["recommendations"] {
  if (result.status === "not_found") {
    return { available: false, totalCount: 0, hasExistingRecommendations: false };
  }

  return {
    available: true,
    totalCount: result.data.totalCount,
    hasExistingRecommendations: result.data.totalCount > 0,
  };
}

function extractCriContext(
  result: SnapshotResult<TeacherCriSnapshot>,
): RejectionIntelligenceContext["cri"] {
  if (result.status === "not_found") {
    return { available: false, score: null, gapTermIds: [] };
  }

  return {
    available: true,
    score: result.data.score,
    gapTermIds: result.data.gapTermIds,
  };
}
