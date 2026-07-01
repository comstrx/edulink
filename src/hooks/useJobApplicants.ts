/**
 * useJobApplicants — Canonical read model for applicants of a specific job.
 *
 * Sprint 2.5 — Single source of truth for applicant lists.
 * Used by Pipeline, Applicants pages. No local computation — pure data fetch.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApplicantTeacher {
  id: string;
  full_name: string;
  avatar_url: string | null;
  years_of_experience: number | null;
  subject_ids: string[] | null;
  country_id: string | null;
}

export interface JobApplicantRow {
  id: string;
  job_id: string;
  teacher_id: string;
  status: string;
  created_at: string;
  teacher?: ApplicantTeacher;
}

/**
 * Fetches all applicants for a job, enriched with teacher profile data.
 * Shared across Pipeline and Applicants pages.
 */
export function useJobApplicants(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-applicants", jobId],
    enabled: !!jobId,
    staleTime: 30_000,
    queryFn: async (): Promise<JobApplicantRow[]> => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, job_id, teacher_id, status, created_at")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const teacherIds = (data ?? []).map((a) => a.teacher_id);
      if (teacherIds.length === 0) return [];

      const { data: teachers } = await supabase
        .from("teacher_profiles")
        .select("id, full_name, avatar_url, years_of_experience, subject_ids, country_id")
        .in("id", teacherIds);

      const map = new Map((teachers ?? []).map((t) => [t.id, t]));

      return (data ?? []).map((app) => ({
        ...app,
        teacher: map.get(app.teacher_id) ?? undefined,
      }));
    },
  });
}
