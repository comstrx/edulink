/**
 * Event Context Aggregator — Sprint 4.2 + Sprint 4.3
 *
 * Builds a unified, multi-signal context for a teacher by composing:
 *   1. CrossDomainContext (all intelligence snapshots)
 *   2. Recent event signals (last rejection, application, training completion)
 *   3. Cross-domain counts (hiring, training, trust) — Sprint 4.3
 *
 * Rules:
 *   - All values from canonical snapshot sources only
 *   - No recomputation, no derivation, no scoring
 *   - No decision logic — context building only
 *   - Errors in any section → that section marked unavailable
 */

import { resolveCrossDomainContext, type CrossDomainContext } from "./cross-domain-context.reader";
import { supabase } from "@/integrations/supabase/client";

// ── Recent Event Signals ──────────────────────────────────────

export interface RecentEventSignal {
  signalType: string;
  createdAt: string;
  jobId: string | null;
  applicationId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface RecentEventContext {
  available: boolean;
  hasRecentRejection: boolean;
  hasRecentApplication: boolean;
  hasRecentTrainingCompletion: boolean;
  recentRejectionsCount: number;
  recentApplicationsCount: number;
  recentTrainingCompletionsCount: number;
  lastSignals: RecentEventSignal[];
}

// ── Cross-Domain Summary ──────────────────────────────────────

export interface CrossDomainSummary {
  // Intelligence (from CrossDomainContext)
  criScore: number | null;
  readinessLevel: string | null;
  totalGaps: number;
  hasCriticalGaps: boolean;
  recommendationCount: number;

  // Hiring (from recent signals)
  hasRecentRejection: boolean;
  recentRejectionsCount: number;
  activeApplicationsCount: number;

  // Training (from recent signals + intelligence)
  hasCompletedTraining: boolean;
  recentCompletionsCount: number;
  hasCompletedRelevantTraining: boolean;

  // Trust (from intelligence trust section)
  verificationRatio: number;
  hasVerifiedCredentials: boolean;
}

// ── Aggregated Context ────────────────────────────────────────

export interface AggregatedEventContext {
  teacherId: string;
  available: boolean;

  /** Full intelligence snapshot context (CRI, gaps, recs, trust, talent) */
  intelligence: CrossDomainContext;

  /** Recent event signals from hiring_signals */
  recentEvents: RecentEventContext;

  /** Cross-domain summary (hiring + training + trust) — Sprint 4.3 */
  summary: CrossDomainSummary;
}

// ── Constants ─────────────────────────────────────────────────

const RECENT_SIGNAL_LIMIT = 10;
const RECENT_WINDOW_DAYS = 30;

const REJECTION_TYPES = new Set([
  "application_rejected",
  "application_declined",
]);

const APPLICATION_TYPES = new Set([
  "application_submitted",
  "application_created",
]);

const TRAINING_TYPES = new Set([
  "training_completed",
  "pathway_completed",
  "course_completed",
]);

// ── Builder ───────────────────────────────────────────────────

/**
 * Build unified event context for a teacher.
 * Reads intelligence snapshots + recent hiring signals in parallel.
 */
export async function buildAggregatedEventContext(
  teacherId: string,
  jobId?: string | null,
): Promise<AggregatedEventContext> {
  const [intelligence, recentEvents] = await Promise.all([
    resolveCrossDomainContext(teacherId, jobId),
    readRecentEvents(teacherId),
  ]);

  const available = intelligence.available || recentEvents.available;

  // Training relevance: recent training + teacher has gaps that training could address
  const hasCompletedRelevantTraining =
    recentEvents.hasRecentTrainingCompletion && intelligence.gaps.totalGaps > 0;

  const summary: CrossDomainSummary = {
    // Intelligence
    criScore: intelligence.cri.score,
    readinessLevel: intelligence.talent.readinessLevel,
    totalGaps: intelligence.gaps.totalGaps,
    hasCriticalGaps: intelligence.gaps.hasCriticalGaps,
    recommendationCount: intelligence.recommendations.totalCount,

    // Hiring
    hasRecentRejection: recentEvents.hasRecentRejection,
    recentRejectionsCount: recentEvents.recentRejectionsCount,
    activeApplicationsCount: recentEvents.recentApplicationsCount,

    // Training
    hasCompletedTraining: recentEvents.hasRecentTrainingCompletion,
    recentCompletionsCount: recentEvents.recentTrainingCompletionsCount,
    hasCompletedRelevantTraining,

    // Trust
    verificationRatio: intelligence.trust.verificationRatio,
    hasVerifiedCredentials: intelligence.trust.verifiedCount > 0,
  };

  return { teacherId, available, intelligence, recentEvents, summary };
}

// ── Recent Events Reader ──────────────────────────────────────

async function readRecentEvents(teacherId: string): Promise<RecentEventContext> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RECENT_WINDOW_DAYS);

    const { data, error } = await supabase
      .from("hiring_signals")
      .select("signal_type, created_at, job_id, application_id, metadata")
      .eq("teacher_id", teacherId)
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(RECENT_SIGNAL_LIMIT);

    if (error || !data || data.length === 0) {
      return EMPTY_RECENT;
    }

    const lastSignals: RecentEventSignal[] = data.map((row) => ({
      signalType: row.signal_type,
      createdAt: row.created_at,
      jobId: row.job_id,
      applicationId: row.application_id,
      metadata: (row.metadata as Record<string, unknown>) ?? null,
    }));

    const rejections = lastSignals.filter((s) => REJECTION_TYPES.has(s.signalType));
    const applications = lastSignals.filter((s) => APPLICATION_TYPES.has(s.signalType));
    const trainings = lastSignals.filter((s) => TRAINING_TYPES.has(s.signalType));

    return {
      available: true,
      hasRecentRejection: rejections.length > 0,
      hasRecentApplication: applications.length > 0,
      hasRecentTrainingCompletion: trainings.length > 0,
      recentRejectionsCount: rejections.length,
      recentApplicationsCount: applications.length,
      recentTrainingCompletionsCount: trainings.length,
      lastSignals,
    };
  } catch (err) {
    console.warn("[SmartGlue:AggregatedContext] Recent events read failed:", err);
    return EMPTY_RECENT;
  }
}

const EMPTY_RECENT: RecentEventContext = {
  available: false,
  hasRecentRejection: false,
  hasRecentApplication: false,
  hasRecentTrainingCompletion: false,
  recentRejectionsCount: 0,
  recentApplicationsCount: 0,
  recentTrainingCompletionsCount: 0,
  lastSignals: [],
};
