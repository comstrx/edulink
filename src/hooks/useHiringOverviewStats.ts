import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

export interface HiringOverviewStats {
  activeJobs: number;
  draftJobs: number;
  closedJobs: number;
  totalApplicants: number;
  newApplicants: number;
  shortlistedApplicants: number;
  pendingReviewApplicants: number;
  pendingInterviews: number;
  interviewsThisWeek: number;
  jobsWithNoApplicants: number;
  recentJobs: Array<{ id: string; title: string; status: string; applicantCount: number }>;
}

export function useHiringOverviewStats() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["hiring_overview_stats", schoolId],
    enabled: !!schoolId && !wsLoading,
    staleTime: 60_000,
    queryFn: async (): Promise<HiringOverviewStats> => {
      if (!schoolId) throw new Error("No school context");

      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [jobsRes, applicantsRes, interviewsRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, title, status, created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false }),

        supabase
          .from("applications")
          .select("id, job_id, status, created_at, jobs!inner(school_id)")
          .eq("jobs.school_id", schoolId),

        supabase
          .from("interviews")
          .select("id, scheduled_at, status, jobs!inner(school_id)")
          .eq("jobs.school_id", schoolId),
      ]);

      const jobs = jobsRes.data ?? [];
      const applicants = applicantsRes.data ?? [];
      const interviews = interviewsRes.data ?? [];

      const activeJobs = jobs.filter((j) => j.status === "published").length;
      const draftJobs = jobs.filter((j) => j.status === "draft").length;
      const closedJobs = jobs.filter((j) => j.status === "closed").length;

      // Applicant stats
      const newApplicants = applicants.filter(
        (a) => a.created_at >= sevenDaysAgo
      ).length;
      const shortlistedApplicants = applicants.filter(
        (a) => a.status === "shortlisted"
      ).length;
      const pendingReviewApplicants = applicants.filter(
        (a) => a.status === "applied"
      ).length;

      // Interview stats
      const scheduledInterviews = interviews.filter((i) => i.status === "scheduled");
      const pendingInterviews = scheduledInterviews.filter(
        (i) => i.scheduled_at >= now.toISOString()
      ).length;
      const interviewsThisWeek = scheduledInterviews.filter(
        (i) => i.scheduled_at >= now.toISOString() && i.scheduled_at <= weekFromNow
      ).length;

      // Jobs with no applicants
      const jobIdsWithApps = new Set(applicants.map((a) => a.job_id));
      const publishedJobs = jobs.filter((j) => j.status === "published");
      const jobsWithNoApplicants = publishedJobs.filter(
        (j) => !jobIdsWithApps.has(j.id)
      ).length;

      // Recent jobs with applicant counts
      const appCountByJob = new Map<string, number>();
      for (const a of applicants) {
        appCountByJob.set(a.job_id, (appCountByJob.get(a.job_id) ?? 0) + 1);
      }
      const recentJobs = jobs.slice(0, 5).map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        applicantCount: appCountByJob.get(j.id) ?? 0,
      }));

      return {
        activeJobs,
        draftJobs,
        closedJobs,
        totalApplicants: applicants.length,
        newApplicants,
        shortlistedApplicants,
        pendingReviewApplicants,
        pendingInterviews,
        interviewsThisWeek,
        jobsWithNoApplicants,
        recentJobs,
      };
    },
  });
}
