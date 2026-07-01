/**
 * Interaction Signal Reader — Sprint 4.6, Step 3
 *
 * Reads aggregated interaction metrics from recommendation_feedback_signals
 * and provides them as a lightweight context for the feedback overlay.
 *
 * This is complementary to TeacherOutcomeFeedback (Sprint 15) which
 * derives signals from intelligence snapshots. Interaction signals
 * measure how the user engages with recommendations in the UI.
 */

import { supabase } from "@/integrations/supabase/client";

export interface InteractionSignals {
  totalClicks: number;
  totalExecutions: number;
  executionRate: number; // executions / clicks (0–1)
  recentExecutions: number; // last 30 days
}

const EMPTY_SIGNALS: InteractionSignals = {
  totalClicks: 0,
  totalExecutions: 0,
  executionRate: 0,
  recentExecutions: 0,
};

/**
 * Read interaction signals for a teacher. Pure read, no side effects.
 */
export async function readInteractionSignals(
  teacherId: string,
): Promise<InteractionSignals> {
  try {
    const { data, error } = await (supabase as any)
      .from("recommendation_feedback_signals")
      .select("signal_type, created_at")
      .eq("teacher_id", teacherId);

    if (error || !data || data.length === 0) return EMPTY_SIGNALS;

    const rows = data as Array<{ signal_type: string; created_at: string }>;
    const totalClicks = rows.filter((r) => r.signal_type === "recommendation_clicked").length;
    const totalExecutions = rows.filter((r) => r.signal_type === "recommendation_executed").length;
    const executionRate = totalClicks > 0 ? totalExecutions / totalClicks : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentExecutions = rows.filter(
      (r) => r.signal_type === "recommendation_executed" && r.created_at >= thirtyDaysAgo,
    ).length;

    return { totalClicks, totalExecutions, executionRate, recentExecutions };
  } catch {
    return EMPTY_SIGNALS;
  }
}
