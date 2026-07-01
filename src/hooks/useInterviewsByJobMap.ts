/**
 * useInterviewsByJobMap — Batch interview lookup for a job, indexed by application_id.
 *
 * Phase 4.3C — Avoids N+1 by fetching all interviews for a job once,
 * then providing a map keyed by application_id for O(1) lookup per card.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InterviewSummary {
  id: string;
  scheduled_at: string;
  status: string;
  meeting_link: string | null;
  notes: string | null;
}

interface InterviewJobRow {
  id: string;
  application_id: string;
  scheduled_at: string;
  status: string;
  meeting_link: string | null;
  notes: string | null;
}

/**
 * Returns a Map<applicationId, InterviewSummary[]> for all interviews under a job.
 * Cards can look up their next scheduled interview in O(1).
 */
export function useInterviewsByJobMap(jobId: string | undefined) {
  return useQuery({
    queryKey: ["interviews", "by-job-map", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("id, application_id, scheduled_at, status, meeting_link, notes")
        .eq("job_id", jobId!)
        .order("scheduled_at", { ascending: true })
        .returns<InterviewJobRow[]>();
      if (error) throw error;

      const map = new Map<string, InterviewSummary[]>();
      for (const row of data ?? []) {
        const appId = row.application_id;
        if (!map.has(appId)) map.set(appId, []);
        map.get(appId)!.push({
          id: row.id,
          scheduled_at: row.scheduled_at,
          status: row.status,
          meeting_link: row.meeting_link,
          notes: row.notes,
        });
      }
      return map;
    },
    staleTime: 30_000,
  });
}
