/**
 * fetchRecommendationStatuses — Status Lookup Helper
 *
 * Queries training_enrollments to derive real status
 * for recommendation targetIds.
 *
 * Sprint 4 — Phase 1, Step 6: Recommendation Status Wiring
 */

import { supabase } from "@/integrations/supabase/client";
import type { UIRecommendationStatus } from "../unified-recommendations.adapter";

/**
 * Given a teacher and a set of target item IDs, returns a map
 * of itemId → UIRecommendationStatus derived from enrollment state.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchRecommendationStatuses(
  teacherId: string,
  targetIds: string[],
): Promise<Record<string, UIRecommendationStatus>> {
  if (!teacherId || targetIds.length === 0) return {};

  const uniqueIds = [...new Set(targetIds)].filter((id) => UUID_RE.test(id));
  if (uniqueIds.length === 0) return {};

  const { data: enrollments, error } = await supabase
    .from("training_enrollments")
    .select("item_id, status")
    .eq("teacher_id", teacherId)
    .in("item_id", uniqueIds);

  if (error || !enrollments) return {};

  // For each item, pick the "most advanced" enrollment status:
  //   completed > active > enrolled
  const statusMap: Record<string, UIRecommendationStatus> = {};

  for (const row of enrollments) {
    const current = statusMap[row.item_id];
    const mapped = mapEnrollmentStatus(row.status);

    if (!current || STATUS_RANK[mapped] > (STATUS_RANK[current] ?? 0)) {
      statusMap[row.item_id] = mapped;
    }
  }

  return statusMap;
}

const STATUS_RANK: Record<UIRecommendationStatus, number> = {
  new: 0,
  in_progress: 1,
  completed: 2,
};

function mapEnrollmentStatus(enrollmentStatus: string): UIRecommendationStatus {
  if (enrollmentStatus === "completed") return "completed";
  if (enrollmentStatus === "active") return "in_progress";
  // enrolled, cancelled, dropped → treat as "new" (not yet started)
  return "new";
}
