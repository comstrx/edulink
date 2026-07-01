/**
 * useHiringAnalytics — Read-only analytics derived from hiring_signals.
 *
 * Phase 4.5 — Hiring Analytics Foundation.
 *
 * Computes basic hiring metrics from the append-only hiring_signals table.
 * No writes, no side effects, no workflow coupling.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

export interface HiringMetrics {
  applicationsCount: number;
  interviewsCount: number;
  hiresCount: number;
  interviewRate: number; // 0–1
  hireRate: number;      // 0–1
  rejectionsCount: number;
  withdrawalsCount: number;
}

interface AnalyticsOptions {
  jobId?: string;
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
}

/**
 * Fetches hiring metrics for the current school user.
 * All metrics derived from hiring_signals via simple count aggregation.
 */
export function useHiringAnalytics(options?: AnalyticsOptions) {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["hiring-analytics", schoolId, options?.jobId, options?.dateFrom, options?.dateTo],
    enabled: !!schoolId && !wsLoading,
    staleTime: 60_000,
    queryFn: async (): Promise<HiringMetrics> => {
      // Get job IDs for this school so we can filter signals
      let jobIdsFilter: string[] | null = null;
      if (options?.jobId) {
        jobIdsFilter = [options.jobId];
      } else {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id")
          .eq("school_id", schoolId!);
        jobIdsFilter = (jobs ?? []).map((j) => j.id);
      }

      if (!jobIdsFilter || jobIdsFilter.length === 0) {
        return emptyMetrics();
      }

      // Single query: fetch all signals for these jobs
      let query = supabase
        .from("hiring_signals" as any)
        .select("signal_type")
        .in("job_id", jobIdsFilter);

      if (options?.dateFrom) {
        query = query.gte("created_at", options.dateFrom) as any;
      }
      if (options?.dateTo) {
        query = query.lte("created_at", options.dateTo) as any;
      }

      const { data, error } = await (query as any);
      if (error) throw error;

      const signals = (data ?? []) as Array<{ signal_type: string }>;

      // Count by type
      const counts: Record<string, number> = {};
      for (const s of signals) {
        counts[s.signal_type] = (counts[s.signal_type] ?? 0) + 1;
      }

      const apps = counts["application_submitted"] ?? 0;
      const interviews = counts["interview_scheduled"] ?? 0;
      const hires = counts["candidate_hired"] ?? 0;
      const rejections = counts["application_rejected"] ?? 0;
      const withdrawals = counts["application_withdrawn"] ?? 0;

      return {
        applicationsCount: apps,
        interviewsCount: interviews,
        hiresCount: hires,
        interviewRate: apps > 0 ? interviews / apps : 0,
        hireRate: apps > 0 ? hires / apps : 0,
        rejectionsCount: rejections,
        withdrawalsCount: withdrawals,
      };
    },
  });
}

function emptyMetrics(): HiringMetrics {
  return {
    applicationsCount: 0,
    interviewsCount: 0,
    hiresCount: 0,
    interviewRate: 0,
    hireRate: 0,
    rejectionsCount: 0,
    withdrawalsCount: 0,
  };
}
