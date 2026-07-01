/**
 * Match Snapshot Writer
 *
 * Persists computed match results to intelligence_match_snapshots.
 * Marks previous snapshots stale before inserting fresh one.
 *
 * Phase 3C
 */

import { supabase } from "@/integrations/supabase/client";
import type { MatchResult } from "@/lib/matching";
import type { MatchDimensionScore } from "@/intelligence/read-models/types/intelligence-read-models.types";
import { logExecution } from "@/smart-glue/execution-telemetry";

const ENGINE_VERSION = "rule-v1";

const DIMENSION_LABELS: Record<string, string> = {
  subjects: "Subjects",
  curriculums: "Curriculums",
  gradeBands: "Grade Bands",
  location: "Location",
  employmentTypes: "Employment Types",
  workArrangements: "Work Arrangements",
  visaStatus: "Visa Status",
  languages: "Languages",
  certifications: "Certifications",
  experience: "Experience",
};

const DIMENSION_MAX: Record<string, number> = {
  subjects: 20,
  curriculums: 15,
  gradeBands: 10,
  location: 10,
  employmentTypes: 10,
  workArrangements: 10,
  languages: 10,
  visaStatus: 5,
  certifications: 5,
  experience: 5,
};

function mapDimensions(result: MatchResult): MatchDimensionScore[] {
  return Object.entries(result.breakdown).map(([key, dim]) => ({
    dimension: key,
    label: DIMENSION_LABELS[key] ?? key,
    score: dim.score,
    maxScore: DIMENSION_MAX[key] ?? 10,
    matched: dim.matched,
    reason: dim.reason,
  }));
}

export async function writeMatchSnapshot(
  teacherId: string,
  jobId: string,
  result: MatchResult,
  traceId?: string,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const dimensions = mapDimensions(result);
  const trace = traceId ?? "no-trace";

  logExecution({ traceId: trace, stage: "event_received", handlerName: "MatchWriter:legacy", status: "ok", meta: { teacherId, jobId, score: result.score, confidence: result.confidence } });

  // Upsert on (teacher_id, job_id) unique constraint
  const { error } = await supabase
    .from("intelligence_match_snapshots")
    .upsert([{
      teacher_id: teacherId,
      job_id: jobId,
      score: result.score,
      confidence: result.confidence,
      dimensions: JSON.parse(JSON.stringify(dimensions)),
      matched_term_ids: result.matchedTermIds,
      unmatched_term_ids: result.unmatchedTermIds,
      staleness: "fresh",
      engine_version: ENGINE_VERSION,
      computed_at: now,
      updated_at: now,
    }], { onConflict: "teacher_id,job_id" });

  if (error) {
    logExecution({ traceId: trace, stage: "handler_failed", handlerName: "MatchWriter:legacy", status: "failed", meta: { error: error.message } });
    return { success: false, error: error.message };
  }

  logExecution({ traceId: trace, stage: "handler_completed", handlerName: "MatchWriter:legacy", status: "ok", meta: { teacherId, jobId } });
  return { success: true };
}