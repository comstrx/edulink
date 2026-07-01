/**
 * useSchoolInterviews — Canonical read model for all interviews in a school.
 *
 * Sprint 2.5 — Single source of truth for interview data.
 * Enriches raw interview rows with teacher names and job titles.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InterviewRow } from "@/hooks/useInterviews";

export interface InterviewWithContext extends InterviewRow {
  teacher_name: string;
  teacher_avatar: string | null;
  job_title: string;
}

/**
 * Fetches ALL interviews for a school's jobs in a single batch,
 * enriched with teacher and job context.
 */
export function useSchoolInterviews(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-all-interviews", schoolId],
    enabled: !!schoolId,
    staleTime: 30_000,
    queryFn: async (): Promise<InterviewWithContext[]> => {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("school_id", schoolId!);
      if (!jobs || jobs.length === 0) return [];

      const jobIds = jobs.map((j) => j.id);
      const jobMap = new Map(jobs.map((j) => [j.id, j.title]));

      const { data: interviews, error } = await (supabase
        .from("interviews" as any)
        .select("*")
        .in("job_id", jobIds)
        .order("scheduled_at", { ascending: true }) as any);
      if (error) throw error;
      const rows = (interviews ?? []) as InterviewRow[];
      if (rows.length === 0) return [];

      const teacherIds = [...new Set(rows.map((r) => r.teacher_id))];
      const { data: teachers } = await supabase
        .from("teacher_profiles")
        .select("id, full_name, avatar_url")
        .in("id", teacherIds);
      const tMap = new Map((teachers ?? []).map((t) => [t.id, t]));

      return rows.map((r) => ({
        ...r,
        teacher_name: tMap.get(r.teacher_id)?.full_name ?? "Unknown",
        teacher_avatar: tMap.get(r.teacher_id)?.avatar_url ?? null,
        job_title: jobMap.get(r.job_id) ?? "Unknown Job",
      }));
    },
  });
}
