/**
 * useSchoolJobs — Canonical read model for a school's jobs.
 *
 * Sprint 2.5 — Single source of truth for job lists across all hiring surfaces.
 * All school hiring pages must use this hook instead of inline queries.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolJobRow {
  id: string;
  title: string;
  status: string;
}

/**
 * Fetches all jobs for a given school, ordered by most recent first.
 * Used by Pipeline, Applicants, Interviews, and Overview pages.
 */
export function useSchoolJobs(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-jobs", schoolId],
    enabled: !!schoolId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SchoolJobRow[];
    },
  });
}
