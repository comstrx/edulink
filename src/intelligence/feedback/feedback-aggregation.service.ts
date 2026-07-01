/**
 * Feedback Aggregation Service — Sprint 4.6, Step 2
 *
 * Transforms raw feedback signals into a per-teacher behavior summary.
 * READ-ONLY — does not affect recommendations or priority.
 *
 * Queries recommendation_feedback_signals table and computes:
 *   - totalClicks / totalExecutions
 *   - clickRate / executionRate
 *   - lastInteractionTime
 */

import { supabase } from "@/integrations/supabase/client";

export interface TeacherFeedbackSummary {
  teacherId: string;
  totalRecommendationsSeen: number;
  totalClicks: number;
  totalExecutions: number;
  clickRate: number;
  executionRate: number;
  lastInteractionTime: string | null;
  recentExecutions: number; // last 30 days
}

const EMPTY_SUMMARY = (teacherId: string): TeacherFeedbackSummary => ({
  teacherId,
  totalRecommendationsSeen: 0,
  totalClicks: 0,
  totalExecutions: 0,
  clickRate: 0,
  executionRate: 0,
  lastInteractionTime: null,
  recentExecutions: 0,
});

/**
 * Build a feedback behavior summary for a single teacher.
 * Pure read — no side effects.
 */
export async function buildTeacherFeedbackSummary(
  teacherId: string,
): Promise<TeacherFeedbackSummary> {
  const { data, error } = await (supabase as any)
    .from("recommendation_feedback_signals")
    .select("signal_type, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    if (error) console.warn("[FeedbackAgg] Query error:", error.message);
    return EMPTY_SUMMARY(teacherId);
  }

  const rows = data as Array<{ signal_type: string; created_at: string }>;

  const totalClicks = rows.filter((r) => r.signal_type === "recommendation_clicked").length;
  const totalExecutions = rows.filter((r) => r.signal_type === "recommendation_executed").length;

  // "seen" = unique click events (each click implies the rec was seen)
  const totalRecommendationsSeen = totalClicks;

  const clickRate = totalRecommendationsSeen > 0 ? totalClicks / totalRecommendationsSeen : 0;
  const executionRate = totalClicks > 0 ? totalExecutions / totalClicks : 0;

  const lastInteractionTime = rows[0]?.created_at ?? null;

  // Recent executions (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentExecutions = rows.filter(
    (r) => r.signal_type === "recommendation_executed" && r.created_at >= thirtyDaysAgo,
  ).length;

  return {
    teacherId,
    totalRecommendationsSeen,
    totalClicks,
    totalExecutions,
    clickRate,
    executionRate,
    lastInteractionTime,
    recentExecutions,
  };
}
