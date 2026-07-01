/**
 * useSchoolDashboardStats — Aggregated school dashboard stats.
 *
 * Sprint 2.5 — Delegates hiring stats to useHiringOverviewStats (canonical source).
 * Only fetches non-hiring data (team, training) directly.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useHiringOverviewStats } from "@/hooks/useHiringOverviewStats";

export interface SchoolDashboardStats {
  activeJobs: number;
  totalApplicants: number;
  pendingReviewApplicants: number;
  pendingInterviews: number;
  teamMembers: number;
  pendingInvitations: number;
  activeAssignments: number;
  overdueAssignments: number;
  recentCompletions: number;
  jobsWithNoApplicants: number;
}

export function useSchoolDashboardStats() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  // Delegate hiring stats to canonical hook
  const { data: hiringStats, isLoading: hiringLoading } = useHiringOverviewStats();

  const { data: nonHiringStats, isLoading: nonHiringLoading } = useQuery({
    queryKey: ["school_dashboard_non_hiring_stats", schoolId],
    enabled: !!schoolId && !wsLoading,
    staleTime: 60_000,
    queryFn: async () => {
      if (!schoolId) throw new Error("No school context");

      const [membersRes, invitationsRes, assignmentsRes] = await Promise.all([
        supabase
          .from("school_members")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "active"),

        supabase
          .from("school_invitations")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "pending"),

        supabase
          .from("training_assignments")
          .select("id, status, due_date")
          .eq("school_id", schoolId),
      ]);

      const assignments = assignmentsRes.data ?? [];
      const now = new Date().toISOString();

      return {
        teamMembers: membersRes.count ?? 0,
        pendingInvitations: invitationsRes.count ?? 0,
        activeAssignments: assignments.filter(
          (a) => a.status === "assigned" || a.status === "in_progress"
        ).length,
        overdueAssignments: assignments.filter(
          (a) =>
            (a.status === "assigned" || a.status === "in_progress") &&
            a.due_date &&
            a.due_date < now
        ).length,
        recentCompletions: assignments.filter(
          (a) => a.status === "completed" || a.status === "certified"
        ).length,
      };
    },
  });

  const isLoading = hiringLoading || nonHiringLoading;

  const data: SchoolDashboardStats | undefined =
    hiringStats && nonHiringStats
      ? {
          activeJobs: hiringStats.activeJobs,
          totalApplicants: hiringStats.totalApplicants,
          pendingReviewApplicants: hiringStats.pendingReviewApplicants,
          pendingInterviews: hiringStats.pendingInterviews,
          jobsWithNoApplicants: hiringStats.jobsWithNoApplicants,
          ...nonHiringStats,
        }
      : undefined;

  return { data, isLoading };
}
