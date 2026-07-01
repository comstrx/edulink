/**
 * useJobMatchContext — Loads a job's structured data for client-side matching.
 *
 * Phase 4.6 — Matching Intelligence v1.
 * Returns a JobMatchInput suitable for `matchTeacherToJob()`.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import type { JobMatchInput } from "@/lib/matching";

interface JobOption {
  id: string;
  title: string;
  status: string;
}

export function useSchoolJobOptions() {
  const { user } = useAuth();
  const { workspace } = useCurrentSchoolWorkspace();
  return useQuery({
    queryKey: ["school-job-options", workspace?.schoolId],
    enabled: !!user?.id && !!workspace?.schoolId,
    staleTime: 60_000,
    queryFn: async (): Promise<JobOption[]> => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status")
        .eq("school_id", workspace.schoolId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useJobMatchInput(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-match-input", jobId],
    enabled: !!jobId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<JobMatchInput | null> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("country_term_id, city_term_id, region_term_id, role_category_term_id, role_type_term_id, school_type_term_id, seniority_level_term_id, visa_status_term_ids, employment_type_term_ids, work_arrangement_term_ids, language_term_ids, language_level_term_id, grade_band_term_ids, subject_term_ids, curriculum_term_ids, certification_term_ids, experience_min")
        .eq("id", jobId!)
        .maybeSingle();
      if (error || !data) return null;
      return data as JobMatchInput;
    },
  });
}
