/**
 * Feedback Signal Service — Sprint 4.6, Step 1 → Sprint 7.5 (traceId linking)
 *
 * Captures recommendation interaction signals and persists them
 * to the recommendation_feedback_signals table.
 *
 * Two signal types:
 *   - recommendation_clicked: user clicked the CTA
 *   - recommendation_executed: action was successfully routed
 *
 * This service is WRITE-ONLY. No decision logic reads from it yet.
 */

import { supabase } from "@/integrations/supabase/client";

export type FeedbackSignalType = "recommendation_clicked" | "recommendation_executed";

export interface FeedbackSignalInput {
  teacherId: string;
  recommendationId: string;
  signalType: FeedbackSignalType;
  actionType: string;
  targetResourceId?: string;
  priority?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record a feedback signal to the database.
 * Fire-and-forget — errors are logged but never thrown to the caller.
 */
export async function recordFeedbackSignal(input: FeedbackSignalInput): Promise<void> {
  try {
    // Include traceId in metadata for decision→action linking
    const enrichedMetadata = {
      ...(input.metadata ?? {}),
      ...(input.traceId ? { traceId: input.traceId } : {}),
    };

    const { error } = await (supabase as any).from("recommendation_feedback_signals").insert({
      teacher_id: input.teacherId,
      recommendation_id: input.recommendationId,
      signal_type: input.signalType,
      action_type: input.actionType,
      target_resource_id: input.targetResourceId ?? null,
      priority: input.priority ?? null,
      metadata: enrichedMetadata,
    });

    if (error) {
      console.warn("[FeedbackSignal] Failed to persist signal:", error.message);
    } else if (import.meta.env.DEV) {
      console.info(
        `[FeedbackSignal] ✅ ${input.signalType} — rec:${input.recommendationId} action:${input.actionType} trace:${input.traceId ?? "n/a"}`,
      );
    }
  } catch (err) {
    console.warn("[FeedbackSignal] Unexpected error:", err);
  }
}
