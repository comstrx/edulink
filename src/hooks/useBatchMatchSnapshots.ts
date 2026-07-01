import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight match summary for list rendering.
 * Subset of MatchConsumptionData — no dimensions, no term lists.
 */
export interface MatchSnapshotSummary {
  score: number;
  confidence: "low" | "medium" | "high";
}

/**
 * Batch-fetches match snapshot summaries for a teacher across multiple jobs.
 * Single query. Returns Map<jobId, MatchSnapshotSummary>.
 */
export function useBatchMatchSnapshots(
  teacherId: string | undefined,
  jobIds: string[]
) {
  return useQuery<Record<string, MatchSnapshotSummary>>({
    queryKey: ["intelligence", "match-batch", teacherId, jobIds],
    enabled: !!teacherId && jobIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intelligence_match_snapshots")
        .select("job_id, score, confidence")
        .eq("teacher_id", teacherId!)
        .in("job_id", jobIds)
        .order("computed_at", { ascending: false });

      if (error) throw error;

      // Keep only the latest snapshot per job (already sorted desc by computed_at)
      const result: Record<string, MatchSnapshotSummary> = {};
      for (const row of data ?? []) {
        if (!result[row.job_id]) {
          result[row.job_id] = {
            score: Number(row.score),
            confidence: (row.confidence ?? "medium") as "low" | "medium" | "high",
          };
        }
      }
      return result;
    },
  });
}
