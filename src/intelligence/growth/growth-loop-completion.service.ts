/**
 * Growth Loop Completion Service — Sprint 2 Step 5
 *
 * Closes the Growth feedback loop by marking recommendations as completed
 * when outcome signals detect that a teacher has acted on them.
 *
 * This is the missing link between:
 *   outcome detection (detectRecommendationOutcome) → status update (markGrowthRecommendationCompleted)
 *
 * NO new business logic. Only wires existing functions together.
 */

import { supabase } from "@/integrations/supabase/client";
import { logExecution } from "@/smart-glue/execution-telemetry";

export interface LoopCompletionResult {
  teacherId: string;
  completedRecommendationIds: string[];
  totalMarked: number;
  success: boolean;
  error?: string;
}

/**
 * When a teacher completes a course that was previously recommended,
 * mark matching active recommendations as "completed".
 */
export async function completeRecommendationsForCourse(
  teacherId: string,
  courseId: string,
  traceId?: string,
): Promise<LoopCompletionResult> {
  const trace = traceId ?? "no-trace";
  try {
    const { data: matchingRecs, error: queryError } = await supabase
      .from("growth_recommendations")
      .select("id, recommendation_trace")
      .eq("teacher_id", teacherId)
      .eq("recommended_item_id", courseId)
      .eq("status", "active");

    if (queryError) {
      logExecution({ traceId: trace, stage: "handler_failed", handlerName: "LoopClosure:course", status: "failed", meta: { error: queryError.message, teacherId, courseId } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: queryError.message };
    }

    const ids = (matchingRecs ?? []).map((r) => r.id);

    if (ids.length === 0) {
      logExecution({ traceId: trace, stage: "handler_completed", handlerName: "LoopClosure:course", status: "skipped", meta: { reason: "no_matching_recommendations", teacherId, courseId } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: true };
    }

    const now = new Date().toISOString();
    const originTraceIds = (matchingRecs ?? [])
      .map((r) => (r.recommendation_trace as any)?.traceId)
      .filter(Boolean);
    const { error: updateError } = await supabase
      .from("growth_recommendations")
      .update({
        status: "completed",
        updated_at: now,
        completion_source_type: "course",
        completion_source_id: courseId,
        completion_reason_key: "completed_course",
        completion_metadata: { courseId, closureTraceId: trace, originTraceIds },
      } as any)
      .in("id", ids);

    if (updateError) {
      logExecution({ traceId: trace, stage: "handler_failed", handlerName: "LoopClosure:course", status: "failed", meta: { error: updateError.message, teacherId, courseId } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: updateError.message };
    }

    logExecution({ traceId: trace, stage: "handler_completed", handlerName: "LoopClosure:course", status: "ok", meta: { teacherId, courseId, closedCount: ids.length } });
    return { teacherId, completedRecommendationIds: ids, totalMarked: ids.length, success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logExecution({ traceId: trace, stage: "pipeline_error", handlerName: "LoopClosure:course", status: "failed", meta: { error: msg } });
    return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: msg };
  }
}

/**
 * When a credential is earned, mark matching credential-pursuit recommendations as completed.
 */
export async function completeRecommendationsForCredential(
  teacherId: string,
  credentialTermIds: string[],
  traceId?: string,
): Promise<LoopCompletionResult> {
  const trace = traceId ?? "no-trace";
  if (credentialTermIds.length === 0) {
    logExecution({ traceId: trace, stage: "handler_completed", handlerName: "LoopClosure:credential", status: "skipped", meta: { reason: "empty_term_ids", teacherId } });
    return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: true };
  }

  try {
    const { data: matchingRecs, error: queryError } = await supabase
      .from("growth_recommendations")
      .select("id, source_term_ids, recommendation_trace")
      .eq("teacher_id", teacherId)
      .eq("recommended_action_type", "pursue_credential")
      .eq("status", "active");

    if (queryError) {
      logExecution({ traceId: trace, stage: "handler_failed", handlerName: "LoopClosure:credential", status: "failed", meta: { error: queryError.message } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: queryError.message };
    }

    const termSet = new Set(credentialTermIds);
    const matched = (matchingRecs ?? []).filter((r) =>
      (r.source_term_ids ?? []).some((tid: string) => termSet.has(tid)),
    );

    const ids = matched.map((r) => r.id);
    if (ids.length === 0) {
      logExecution({ traceId: trace, stage: "handler_completed", handlerName: "LoopClosure:credential", status: "skipped", meta: { reason: "no_term_overlap", teacherId, credentialTermIds, activeRecsChecked: (matchingRecs ?? []).length } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: true };
    }

    const now = new Date().toISOString();
    const originTraceIds = matched
      .map((r) => (r.recommendation_trace as any)?.traceId)
      .filter(Boolean);
    const { error: updateError } = await supabase
      .from("growth_recommendations")
      .update({
        status: "completed",
        updated_at: now,
        completion_source_type: "credential",
        completion_source_id: credentialTermIds.join(","),
        completion_reason_key: "earned_credential",
        completion_metadata: { credentialTermIds, closureTraceId: trace, originTraceIds },
      } as any)
      .in("id", ids);

    if (updateError) {
      logExecution({ traceId: trace, stage: "handler_failed", handlerName: "LoopClosure:credential", status: "failed", meta: { error: updateError.message } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: updateError.message };
    }

    logExecution({ traceId: trace, stage: "handler_completed", handlerName: "LoopClosure:credential", status: "ok", meta: { teacherId, closedCount: ids.length } });
    return { teacherId, completedRecommendationIds: ids, totalMarked: ids.length, success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logExecution({ traceId: trace, stage: "pipeline_error", handlerName: "LoopClosure:credential", status: "failed", meta: { error: msg } });
    return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: msg };
  }
}

/**
 * When a credential is earned (by credentialId lookup), mark matching
 * pursue_credential recommendations as completed.
 */
export async function completeCredentialRecommendationsByCredentialId(
  teacherId: string,
  credentialId: string,
  traceId?: string,
): Promise<LoopCompletionResult> {
  const trace = traceId ?? "no-trace";
  try {
    const { data: cred } = await supabase
      .from("earned_credentials")
      .select("source_id, source_type")
      .eq("id", credentialId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (!cred?.source_id) {
      logExecution({ traceId: trace, stage: "handler_completed", handlerName: "LoopClosure:credentialById", status: "warn", meta: { reason: "no_source_id_for_deterministic_match", teacherId, credentialId } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: true };
    }

    return completeRecommendationsForCredential(teacherId, [cred.source_id], traceId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logExecution({ traceId: trace, stage: "pipeline_error", handlerName: "LoopClosure:credentialById", status: "failed", meta: { error: msg } });
    return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: msg };
  }
}

/**
 * When a pathway is completed, mark matching active recommendations as completed.
 */
export async function completeRecommendationsForPathway(
  teacherId: string,
  pathwayId: string,
  traceId?: string,
): Promise<LoopCompletionResult> {
  const trace = traceId ?? "no-trace";
  try {
    const { data: matchingRecs, error: queryError } = await supabase
      .from("growth_recommendations")
      .select("id, recommendation_trace")
      .eq("teacher_id", teacherId)
      .eq("recommended_item_id", pathwayId)
      .eq("status", "active");

    if (queryError) {
      logExecution({ traceId: trace, stage: "handler_failed", handlerName: "LoopClosure:pathway", status: "failed", meta: { error: queryError.message, teacherId, pathwayId } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: queryError.message };
    }

    const ids = (matchingRecs ?? []).map((r) => r.id);
    if (ids.length === 0) {
      logExecution({ traceId: trace, stage: "handler_completed", handlerName: "LoopClosure:pathway", status: "skipped", meta: { reason: "no_matching_recommendations", teacherId, pathwayId } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: true };
    }

    const now = new Date().toISOString();
    const originTraceIds = (matchingRecs ?? [])
      .map((r) => (r.recommendation_trace as any)?.traceId)
      .filter(Boolean);
    const { error: updateError } = await supabase
      .from("growth_recommendations")
      .update({
        status: "completed",
        updated_at: now,
        completion_source_type: "pathway",
        completion_source_id: pathwayId,
        completion_reason_key: "completed_pathway",
        completion_metadata: { pathwayId, closureTraceId: trace, originTraceIds },
      } as any)
      .in("id", ids);

    if (updateError) {
      logExecution({ traceId: trace, stage: "handler_failed", handlerName: "LoopClosure:pathway", status: "failed", meta: { error: updateError.message } });
      return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: updateError.message };
    }

    logExecution({ traceId: trace, stage: "handler_completed", handlerName: "LoopClosure:pathway", status: "ok", meta: { teacherId, pathwayId, closedCount: ids.length } });
    return { teacherId, completedRecommendationIds: ids, totalMarked: ids.length, success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logExecution({ traceId: trace, stage: "pipeline_error", handlerName: "LoopClosure:pathway", status: "failed", meta: { error: msg } });
    return { teacherId, completedRecommendationIds: [], totalMarked: 0, success: false, error: msg };
  }
}