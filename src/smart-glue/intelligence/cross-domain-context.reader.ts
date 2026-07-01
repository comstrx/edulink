/**
 * Cross-Domain Intelligence Context Reader — Sprint 12
 *
 * Resolves a composite view of ALL intelligence snapshots for a teacher,
 * enabling Smart Glue rules to reason across domains before making decisions.
 *
 * Rules:
 *   - Reads ONLY from intelligence snapshot tables (via repository)
 *   - Never queries domain tables directly
 *   - Never computes or derives scores
 *   - Fire-and-forget safe (errors → empty sections)
 */

import { supabaseRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type { SnapshotResult } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type {
  TeacherCriSnapshot,
  TeacherGapSnapshot,
  TeacherRecommendationsSnapshot,
  TeacherVerifiedStateSnapshot,
  GapEntry,
} from "@/intelligence/read-models/types/intelligence-read-models.types";
import { supabase } from "@/integrations/supabase/client";
import type { TalentIntelligenceProfile } from "@/intelligence/talent/types/talent-intelligence.types";
import { mapCriScoreToBand } from "@/intelligence/shared/cri-band.utils";

// ── Cross-Domain Context Shape ─────────────────────────────────

export interface CrossDomainContext {
  teacherId: string;
  available: boolean;

  cri: {
    available: boolean;
    score: number | null;
    band: "not_ready" | "emerging" | "strong" | "highly_ready" | null;
    gapTermIds: string[];
    jobId: string | null;
  };

  gaps: {
    available: boolean;
    totalGaps: number;
    topGaps: GapEntry[];
    categories: string[];
    hasCriticalGaps: boolean;
  };

  recommendations: {
    available: boolean;
    totalCount: number;
    hasExisting: boolean;
    staleness: string | null;
  };

  trust: {
    available: boolean;
    overallStatus: "none" | "partial" | "full" | null;
    verifiedCount: number;
    totalCount: number;
    verificationRatio: number;
  };

  talent: {
    available: boolean;
    readinessLevel: string | null;
    growthMomentum: string | null;
    credentialStrength: string | null;
    unresolvedGapCount: number;
    hiringAdvantageCount: number;
  };

  /** Cross-domain derived signals (read-only, no computation) */
  signals: {
    /** Teacher has both gaps AND no recommendations → high-need */
    needsGuidance: boolean;
    /** Teacher has strong trust + high CRI → hiring-ready */
    hiringReady: boolean;
    /** Teacher has active growth (momentum ≠ inactive) */
    activelyGrowing: boolean;
    /** Teacher has critical gaps that overlap with CRI gap terms */
    hasCriAlignedGaps: boolean;
  };
}

// ── Category priority for gap sorting ──────────────────────────

const GAP_CATEGORY_PRIORITY: Record<string, number> = {
  certification: 6, subject: 5, curriculum: 4, skill: 3,
  language: 2, experience: 1, location: 0, other: 0,
};

const CRITICAL_GAP_CATEGORIES = new Set(["certification", "subject", "curriculum"]);

// ── CRI Band helper ────────────────────────────────────────────

function criBand(score: number | null): CrossDomainContext["cri"]["band"] {
  if (score == null) return null;
  return mapCriScoreToBand(score);
}

// ── Main Resolver ──────────────────────────────────────────────

/**
 * Resolve cross-domain intelligence context for a teacher.
 * Reads ALL intelligence snapshot surfaces in parallel.
 *
 * Safe: errors in any one surface → that section marked unavailable.
 */
export async function resolveCrossDomainContext(
  teacherId: string,
  jobId?: string | null,
): Promise<CrossDomainContext> {
  console.debug("[IntelDecision]", JSON.stringify({ stage: "rule", engine: "context-reader", event: "cross_domain_context_resolving", teacherId }));

  // Read all snapshots in parallel — each one is independent
  const [gapResult, recResult, verifiedResult, talentResult, criResult] = await Promise.all([
    safeRead(() => supabaseRepository.getTeacherGapSnapshot(teacherId)),
    safeRead(() => supabaseRepository.getTeacherRecommendationsSnapshot(teacherId)),
    safeRead(() => supabaseRepository.getTeacherVerifiedStateSnapshot(teacherId)),
    safeReadTalent(teacherId),
    jobId ? safeRead(() => supabaseRepository.getTeacherCriSnapshot(teacherId, jobId)) : Promise.resolve(null),
  ]);

  const cri = extractCri(criResult);
  const gaps = extractGaps(gapResult);
  const recommendations = extractRecommendations(recResult);
  const trust = extractTrust(verifiedResult);
  const talent = extractTalent(talentResult);

  const available = cri.available || gaps.available || recommendations.available
    || trust.available || talent.available;

  // Cross-domain signals — purely derived from the sections above
  const signals = deriveSignals(cri, gaps, recommendations, trust, talent);

  console.debug("[IntelDecision]", JSON.stringify({ stage: "rule", engine: "context-reader", event: "cross_domain_context_resolved", available, criScore: cri.score, gaps: gaps.totalGaps }));

  return { teacherId, available, cri, gaps, recommendations, trust, talent, signals };
}

// ── Safe Read Wrappers ─────────────────────────────────────────

async function safeRead<T>(fn: () => Promise<SnapshotResult<T>>): Promise<SnapshotResult<T> | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn("[SmartGlue:CrossDomain] Snapshot read failed:", err);
    return null;
  }
}

async function safeReadTalent(teacherId: string): Promise<TalentIntelligenceProfile | null> {
  try {
    const { data, error } = await supabase
      .from("intelligence_talent_profiles")
      .select("teacher_id, cri_score, readiness_level, growth_momentum, credential_strength, unresolved_gap_count, hiring_advantage_signals")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      teacherId: data.teacher_id,
      criScore: Number(data.cri_score) || 0,
      readinessLevel: (data.readiness_level ?? "early") as TalentIntelligenceProfile["readinessLevel"],
      growthMomentum: (data.growth_momentum ?? "inactive") as TalentIntelligenceProfile["growthMomentum"],
      credentialStrength: (data.credential_strength ?? "none") as TalentIntelligenceProfile["credentialStrength"],
      unresolvedGapCount: data.unresolved_gap_count ?? 0,
      hiringAdvantageSignals: (Array.isArray(data.hiring_advantage_signals) ? data.hiring_advantage_signals : []) as unknown as TalentIntelligenceProfile["hiringAdvantageSignals"],
      // Fields not needed for cross-domain context — zeroed out
      criDimensions: [],
      criJobId: null,
      verifiedSignalCount: 0,
      verifiedCompletionCount: 0,
      credentialCount: 0,
      credentialVerifiedCount: 0,
      pathwayCompletionCount: 0,
      activePathwayCount: 0,
      trainingCompletionCount: 0,
      gapCategories: [],
      bestMatchScore: null,
      bestMatchJobId: null,
      intelligenceUpdatedAt: "",
      engineVersion: "",
    };
  } catch {
    return null;
  }
}

// ── Extractors ─────────────────────────────────────────────────

function extractCri(
  result: SnapshotResult<TeacherCriSnapshot> | null,
): CrossDomainContext["cri"] {
  if (!result || result.status === "not_found") {
    return { available: false, score: null, band: null, gapTermIds: [], jobId: null };
  }
  const d = result.data;
  return {
    available: true,
    score: d.score,
    band: criBand(d.score),
    gapTermIds: d.gapTermIds,
    jobId: d.jobId,
  };
}

function extractGaps(
  result: SnapshotResult<TeacherGapSnapshot> | null,
): CrossDomainContext["gaps"] {
  if (!result || result.status === "not_found") {
    return { available: false, totalGaps: 0, topGaps: [], categories: [], hasCriticalGaps: false };
  }
  const d = result.data;
  const categories = [...new Set(d.gaps.map((g) => g.category))];
  const hasCriticalGaps = categories.some((c) => CRITICAL_GAP_CATEGORIES.has(c));

  const sorted = [...d.gaps].sort(
    (a, b) => (GAP_CATEGORY_PRIORITY[b.category] ?? 0) - (GAP_CATEGORY_PRIORITY[a.category] ?? 0),
  );

  return {
    available: true,
    totalGaps: d.totalGaps,
    topGaps: sorted.slice(0, 5),
    categories,
    hasCriticalGaps,
  };
}

function extractRecommendations(
  result: SnapshotResult<TeacherRecommendationsSnapshot> | null,
): CrossDomainContext["recommendations"] {
  if (!result || result.status === "not_found") {
    return { available: false, totalCount: 0, hasExisting: false, staleness: null };
  }
  return {
    available: true,
    totalCount: result.data.totalCount,
    hasExisting: result.data.totalCount > 0,
    staleness: result.data.meta.staleness,
  };
}

function extractTrust(
  result: SnapshotResult<TeacherVerifiedStateSnapshot> | null,
): CrossDomainContext["trust"] {
  if (!result || result.status === "not_found") {
    return { available: false, overallStatus: null, verifiedCount: 0, totalCount: 0, verificationRatio: 0 };
  }
  const d = result.data;
  const ratio = d.totalCount > 0 ? d.verifiedCount / d.totalCount : 0;
  return {
    available: true,
    overallStatus: d.overallStatus,
    verifiedCount: d.verifiedCount,
    totalCount: d.totalCount,
    verificationRatio: Math.round(ratio * 100) / 100,
  };
}

function extractTalent(
  profile: TalentIntelligenceProfile | null,
): CrossDomainContext["talent"] {
  if (!profile) {
    return {
      available: false, readinessLevel: null, growthMomentum: null,
      credentialStrength: null, unresolvedGapCount: 0, hiringAdvantageCount: 0,
    };
  }
  return {
    available: true,
    readinessLevel: profile.readinessLevel,
    growthMomentum: profile.growthMomentum,
    credentialStrength: profile.credentialStrength,
    unresolvedGapCount: profile.unresolvedGapCount,
    hiringAdvantageCount: profile.hiringAdvantageSignals.length,
  };
}

// ── Cross-Domain Signal Derivation ─────────────────────────────

function deriveSignals(
  cri: CrossDomainContext["cri"],
  gaps: CrossDomainContext["gaps"],
  recs: CrossDomainContext["recommendations"],
  trust: CrossDomainContext["trust"],
  talent: CrossDomainContext["talent"],
): CrossDomainContext["signals"] {
  // Teacher has gaps but no recommendations → needs guidance
  const needsGuidance = gaps.totalGaps > 0 && !recs.hasExisting;

  // Strong trust (full or high ratio) + high CRI → hiring-ready
  const hiringReady = (
    trust.overallStatus === "full" || trust.verificationRatio >= 0.8
  ) && (cri.score != null && cri.score >= 55);

  // Active growth momentum
  const activelyGrowing = talent.growthMomentum != null && talent.growthMomentum !== "inactive";

  // Critical gaps that overlap with CRI gap terms
  const hasCriAlignedGaps = cri.gapTermIds.length > 0 && gaps.topGaps.some(
    (g) => cri.gapTermIds.includes(g.termId),
  );

  return { needsGuidance, hiringReady, activelyGrowing, hasCriAlignedGaps };
}
