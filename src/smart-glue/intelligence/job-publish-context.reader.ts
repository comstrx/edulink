/**
 * Job Publish Context Reader — Sprint 13 PART 3
 *
 * Reads intelligence snapshots for applicants relevant to a newly published job.
 * Used by decision engine to determine match refresh scope.
 *
 * Reads ONLY intelligence snapshots — never domain tables (except jobs for term IDs).
 */

import { supabase } from "@/integrations/supabase/client";

export interface JobPublishDecisionContext {
  jobId: string;
  /** How many existing applicants does this job's school have across active jobs? */
  existingApplicantCount: number;
  /** How many high-readiness candidates exist (CRI ≥ 55) in the system? */
  highReadinessCandidateCount: number;
  /** How many verified candidates exist? */
  verifiedCandidateCount: number;
  /** Whether the job has subject term IDs (enables targeted match) */
  hasSubjectTerms: boolean;
  /** Whether school already has recent match snapshots */
  hasRecentMatches: boolean;
}

/**
 * Resolve context for a job-published decision.
 * Lightweight: counts from intelligence snapshots only.
 */
export async function readJobPublishContext(
  jobId: string,
  schoolId: string,
): Promise<JobPublishDecisionContext> {
  try {
    const [jobResult, applicantResult, criResult, verifiedResult, matchResult] = await Promise.all([
      // Job metadata (for subject terms check)
      supabase
        .from("jobs")
        .select("subject_term_ids")
        .eq("id", jobId)
        .maybeSingle(),

      // Count existing applicants for this school's active jobs
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .in("job_id", 
          supabase
            .from("jobs")
            .select("id")
            .eq("school_id", schoolId)
            .eq("status", "published") as any
        ),

      // Count high-readiness talent profiles
      supabase
        .from("intelligence_talent_profiles")
        .select("id", { count: "exact", head: true })
        .gte("cri_score", 55),

      // Count verified candidates
      supabase
        .from("intelligence_verified_state_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("overall_status", "full"),

      // Check if any match snapshots exist for this job already
      supabase
        .from("intelligence_match_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("job_id", jobId),
    ]);

    return {
      jobId,
      existingApplicantCount: applicantResult.count ?? 0,
      highReadinessCandidateCount: criResult.count ?? 0,
      verifiedCandidateCount: verifiedResult.count ?? 0,
      hasSubjectTerms: Array.isArray(jobResult.data?.subject_term_ids) && jobResult.data.subject_term_ids.length > 0,
      hasRecentMatches: (matchResult.count ?? 0) > 0,
    };
  } catch (err) {
    console.warn("[SmartGlue:JobPublishContext] Read failed:", err);
    return {
      jobId,
      existingApplicantCount: 0,
      highReadinessCandidateCount: 0,
      verifiedCandidateCount: 0,
      hasSubjectTerms: false,
      hasRecentMatches: false,
    };
  }
}
