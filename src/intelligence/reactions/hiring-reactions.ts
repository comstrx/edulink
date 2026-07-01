/**
 * Hiring Event Reactions
 *
 * Lightweight reaction functions triggered by hiring domain events.
 * Sprint 5: Legacy growth pipeline removed — ONLY snapshot pipeline runs.
 */

import { refreshGaps } from "@/intelligence/gaps/services/gap-refresh.service";
import { refreshCri } from "@/intelligence/cri/services/cri-refresh.service";
import { refreshMatch } from "@/intelligence/matching/services/match-refresh.service";
import { refreshRecommendations } from "@/intelligence/recommendations/services/recommendation-refresh.service";
import { processReputationEvent } from "@/reputation/engine/reputation-event-handler";

interface SubtaskResult {
  subtask: string;
  status: "success" | "error";
  error?: unknown;
}

function logReaction(event: string, teacherId: string, refId: string, results: SubtaskResult[]) {
  for (const r of results) {
    if (r.status === "success") {
      console.log(`[Reaction] event=${event} teacher_id=${teacherId} ref=${refId} subtask=${r.subtask} status=success`);
    } else {
      console.error(`[Reaction] event=${event} teacher_id=${teacherId} ref=${refId} subtask=${r.subtask} status=error`, r.error);
    }
  }
}

function mapSettled(settled: PromiseSettledResult<unknown>[], names: readonly string[]): SubtaskResult[] {
  return settled.map((r, i) => ({
    subtask: names[i] ?? `subtask_${i}`,
    status: r.status === "fulfilled" ? "success" : "error",
    error: r.status === "rejected" ? r.reason : undefined,
  }));
}

// ── EVENT: Job Applied ─────────────────────────────────────────

export async function onJobApplied(teacherId: string, applicationId: string, jobId: string): Promise<void> {
  if (!teacherId || !applicationId) {
    console.warn(`[Reaction] event=hiring.job_applied SKIPPED — missing ids (teacher=${teacherId}, app=${applicationId})`);
    return;
  }

  const names = ["refresh_cri", "refresh_gaps", "refresh_match", "reputation_event"] as const;

  const settled = await Promise.allSettled([
    refreshCri({ teacherId, triggeredByEvent: "hiring.job_applied" }),
    refreshGaps({ teacherId, triggeredByEvent: "hiring.job_applied" }),
    refreshMatch({ teacherId, jobId, triggeredByEvent: "hiring.job_applied" }),
    processReputationEvent({
      teacherId,
      eventType: "job_applied",
      sourceDomain: "hiring",
      sourceReferenceId: applicationId,
    }),
  ]);

  logReaction("hiring.job_applied", teacherId, applicationId, mapSettled(settled, names));
}

// ── EVENT: Application Rejected ────────────────────────────────

export async function onApplicationRejected(teacherId: string, applicationId: string): Promise<void> {
  if (!teacherId || !applicationId) {
    console.warn(`[Reaction] event=hiring.application_rejected SKIPPED — missing ids`);
    return;
  }

  const names = ["refresh_gaps", "refresh_recommendations"] as const;

  const settled = await Promise.allSettled([
    refreshGaps({ teacherId, triggeredByEvent: "hiring.application_rejected" }),
    refreshRecommendations({ teacherId, triggeredBy: "hiring.application_rejected" }),
  ]);

  logReaction("hiring.application_rejected", teacherId, applicationId, mapSettled(settled, names));
}
