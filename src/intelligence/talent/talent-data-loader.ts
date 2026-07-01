/**
 * Talent Intelligence Data Loader
 *
 * Loads raw signals from source-of-truth tables for aggregation.
 * READ-ONLY — no mutations.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

import { supabase } from "@/integrations/supabase/client";
import type { TalentAggregatorRawData } from "./types/talent-intelligence.types";

interface CompletionRow {
  id: string;
  is_verified: boolean | null;
  completed_at: string | null;
}

interface EvidenceRow {
  id: string;
  review_status: string;
}

export async function loadTalentRawData(
  teacherId: string,
): Promise<TalentAggregatorRawData> {
  const [
    criRes,
    gapRes,
    matchRes,
    verifiedRes,
    completionsRes,
    credentialsRes,
    activePathwaysRes,
    completedPathwaysRes,
    mentorRes,
    evidenceRes,
  ] = await Promise.all([
    // Latest CRI snapshot
    supabase
      .from("intelligence_cri_snapshots")
      .select("score, dimensions, job_id, gap_term_ids")
      .eq("teacher_id", teacherId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Latest gap snapshot
    supabase
      .from("intelligence_gap_snapshots")
      .select("total_gaps, gaps")
      .eq("teacher_id", teacherId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // All match snapshots (latest per job)
    supabase
      .from("intelligence_match_snapshots")
      .select("score, job_id, confidence")
      .eq("teacher_id", teacherId)
      .order("score", { ascending: false })
      .limit(10),

    // Verified state
    supabase
      .from("intelligence_verified_state_snapshots")
      .select("verified_count, total_count, overall_status")
      .eq("teacher_id", teacherId)
      .maybeSingle(),

    // Training completions
    supabase
      .from("training_completions")
      .select("id, is_verified, completed_at")
      .eq("teacher_id", teacherId)
      .limit(500)
      .returns<CompletionRow[]>(),

    // Earned credentials
    supabase
      .from("earned_credentials")
      .select("id, status, issued_at")
      .eq("teacher_id", teacherId)
      .eq("status", "active"),

    // Active pathway executions
    supabase
      .from("pathway_executions")
      .select("id, status, progress_percent")
      .eq("teacher_id", teacherId)
      .in("status", ["enrolled", "active"]),

    // Completed pathway executions
    supabase
      .from("pathway_executions")
      .select("id, completed_at")
      .eq("teacher_id", teacherId)
      .eq("status", "completed"),

    // Mentor approvals
    supabase
      .from("mentor_reviews")
      .select("id, reviewed_at")
      .eq("teacher_id", teacherId)
      .eq("review_decision", "approved"),

    // Approved evidence
    supabase
      .from("training_evidence")
      .select("id, review_status")
      .eq("teacher_id", teacherId)
      .eq("review_status", "approved")
      .returns<EvidenceRow[]>(),
  ]);

  // Parse CRI dimensions from JSONB
  const criData = criRes.data;
  let criSnapshot: TalentAggregatorRawData["criSnapshot"] = null;
  if (criData) {
    const dims = Array.isArray(criData.dimensions) ? criData.dimensions : [];
    const parsedDims = dims.map((d) => {
      const dim = d as Record<string, unknown>;
      return {
        dimension: (dim.dimension as string) ?? "",
        label: (dim.label as string) ?? "",
        score: (dim.score as number) ?? 0,
        maxScore: ((dim.maxScore ?? dim.max_score) as number) ?? 0,
        matched: (dim.matched as boolean) ?? false,
      };
    });
    criSnapshot = {
      score: criData.score ?? 0,
      dimensions: parsedDims,
      jobId: criData.job_id ?? "",
      gapTermIds: criData.gap_term_ids ?? [],
    };
  }

  // Parse gap data
  const gapData = gapRes.data;
  let gapSnapshot: TalentAggregatorRawData["gapSnapshot"] = null;
  if (gapData) {
    const gaps = Array.isArray(gapData.gaps) ? gapData.gaps : [];
    gapSnapshot = {
      totalGaps: gapData.total_gaps ?? 0,
      gaps: gaps.map((g) => ({ category: ((g as Record<string, unknown>).category as string) ?? "other" })),
    };
  }

  return {
    criSnapshot,
    gapSnapshot,
    matchSnapshots: (matchRes.data ?? []).map((m) => ({
      score: m.score,
      jobId: m.job_id,
      confidence: m.confidence,
    })),
    verifiedState: verifiedRes.data
      ? {
          verifiedCount: verifiedRes.data.verified_count,
          totalCount: verifiedRes.data.total_count,
          overallStatus: verifiedRes.data.overall_status,
        }
      : null,
    trainingCompletions: (completionsRes.data ?? []).map((c) => ({
      id: c.id,
      isVerified: c.is_verified ?? false,
      completedAt: c.completed_at ?? "",
    })),
    earnedCredentials: (credentialsRes.data ?? []).map((c) => ({
      id: c.id,
      status: c.status,
      issuedAt: c.issued_at,
    })),
    activePathways: (activePathwaysRes.data ?? []).map((p) => ({
      id: p.id,
      status: p.status,
      progressPercent: p.progress_percent,
    })),
    completedPathways: (completedPathwaysRes.data ?? []).map((p) => ({
      id: p.id,
      completedAt: p.completed_at,
    })),
    mentorApprovals: (mentorRes.data ?? []).map((m) => ({
      id: m.id,
      reviewedAt: m.reviewed_at,
    })),
    approvedEvidence: (evidenceRes.data ?? []).map((e) => ({
      id: e.id,
      reviewStatus: e.review_status ?? "approved",
    })),
  };
}
