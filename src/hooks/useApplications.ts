import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { createHiringSignal } from "@/lib/hiring-signals";
import { isValidTransition } from "@/lib/pipeline-stages";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { logDispatchFailure } from "@/smart-glue/dispatch-failure-logger";

/** Fetch the teacher_profile.id for the current user */
async function getTeacherProfileId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** All valid application statuses */
export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "interview"
  | "offer"
  | "hired"
  | "withdrawn"
  | "rejected";

export interface ApplicationRow {
  id: string;
  job_id: string;
  teacher_id: string;
  status: string;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  job?: {
    id: string;
    title: string;
    status: string;
    school_id: string;
    country_term_id: string | null;
    city_term_id: string | null;
    subject_term_ids: string[] | null;
    salary_range: string | null;
    deadline: string | null;
  };
}

/** All applications for the current teacher, with joined job data */
export function useTeacherApplications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teacher-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const profileId = await getTeacherProfileId(user!.id);
      if (!profileId) return [];

      const { data, error } = await supabase
        .from("applications")
        .select("*, job:jobs(id, title, status, school_id, country_term_id, city_term_id, subject_term_ids, salary_range, deadline)")
        .eq("teacher_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ApplicationRow[];
    },
  });
}

/** Check if current teacher already applied to a specific job */
export function useExistingApplication(jobId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["application-check", user?.id, jobId],
    enabled: !!user && !!jobId,
    queryFn: async () => {
      const profileId = await getTeacherProfileId(user!.id);
      if (!profileId) return null;

      const { data, error } = await supabase
        .from("applications")
        .select("id, status")
        .eq("teacher_id", profileId)
        .eq("job_id", jobId!)
        .maybeSingle();

      if (error) throw error;
      return data ? { ...data, teacherProfileId: profileId } : { teacherProfileId: profileId, id: null, status: null };
    },
  });
}

/** Apply to a job */
export function useApplyToJob() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ jobId, teacherProfileId }: { jobId: string; teacherProfileId: string }) => {
      const { data, error } = await supabase.from("applications").insert({
        job_id: jobId,
        teacher_id: teacherProfileId,
        status: "applied",
        source: "public_job_details",
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      toast({ title: "Application submitted", description: "You have successfully applied to this job." });
      qc.invalidateQueries({ queryKey: ["teacher-applications"] });
      qc.invalidateQueries({ queryKey: ["application-check"] });

      // Signal: application_submitted (fire-and-forget)
      createHiringSignal({
        signalType: "application_submitted",
        actorType: "teacher",
        teacherId: vars.teacherProfileId,
        jobId: vars.jobId,
      });

      // Sprint 9.5-C: Fixed — applicationId now comes from insert result, not jobId
      dispatchDomainEvent("hiring", EVENT_NAMES.hiring.jobApplied, {
        applicationId: data.id,
        teacherId: vars.teacherProfileId,
        jobId: vars.jobId,
        appliedAt: new Date().toISOString(),
      }).catch((e) => logDispatchFailure(EVENT_NAMES.hiring.jobApplied, e));
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("duplicate") ? "You have already applied to this job." : "Failed to submit application.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });
}

/** Withdraw, re-apply, reject, or move stage */
export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      applicationId,
      newStatus,
      rejectionReasonTermId,
      teacherId,
      jobId,
    }: {
      applicationId: string;
      newStatus: ApplicationStatus;
      /** Required when newStatus === "rejected". Taxonomy term ID from rejection_reasons domain. */
      rejectionReasonTermId?: string;
      /** Teacher profile ID — passed for rejection event context (3.3e) */
      teacherId?: string;
      /** Job ID — passed for rejection event context (3.3e) */
      jobId?: string;
    }) => {
      // Fetch current status and validate transition
      const { data: current, error: fetchErr } = await supabase
        .from("applications")
        .select("status")
        .eq("id", applicationId)
        .single();
      if (fetchErr) throw fetchErr;

      const currentStatus = current.status as ApplicationStatus;

      // Allow re-apply (withdrawn → applied) as a special case
      if (!(currentStatus === "withdrawn" && newStatus === "applied")) {
        if (!isValidTransition(currentStatus, newStatus)) {
          throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`);
        }
      }

      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      const STATUS_LABELS: Record<string, string> = {
        rejected: "Application rejected",
        withdrawn: "Application withdrawn",
        applied: "Application re-submitted",
        shortlisted: "Applicant shortlisted",
        interview: "Moved to interview",
        offer: "Offer extended",
        hired: "Applicant hired",
      };
      toast({ title: STATUS_LABELS[vars.newStatus] ?? "Status updated" });
      qc.invalidateQueries({ queryKey: ["teacher-applications"] });
      qc.invalidateQueries({ queryKey: ["application-check"] });
      qc.invalidateQueries({ queryKey: ["job-applicants"] });
      qc.invalidateQueries({ queryKey: ["pipeline-applicants"] });

      // Sprint 9.6: Dispatch status_changed for ALL transitions via Smart Glue
      dispatchDomainEvent("hiring", EVENT_NAMES.hiring.applicationStatusChanged, {
        applicationId: vars.applicationId,
        newStatus: vars.newStatus,
        teacherId: vars.teacherId ?? null,
        jobId: vars.jobId ?? null,
        rejectionReasonTermId: vars.rejectionReasonTermId ?? null,
      }).catch((e) => logDispatchFailure(EVENT_NAMES.hiring.applicationStatusChanged, e));

      // Emit precise rejection domain event (Phase 3.3e)
      if (
        vars.newStatus === "rejected" &&
        vars.teacherId &&
        vars.jobId &&
        vars.rejectionReasonTermId
      ) {
        // Sprint 9.5-A: Single canonical path via Smart Glue
        dispatchDomainEvent("hiring", EVENT_NAMES.hiring.applicationRejected, {
          applicationId: vars.applicationId,
          teacherId: vars.teacherId!,
          jobId: vars.jobId!,
          rejectionReasonTermId: vars.rejectionReasonTermId!,
          rejectedAt: new Date().toISOString(),
        }).catch((e) => logDispatchFailure(EVENT_NAMES.hiring.applicationRejected, e));
      }

      // Sprint 1: Dispatch application_accepted when offer is extended
      if (
        vars.newStatus === "offer" &&
        vars.teacherId &&
        vars.jobId
      ) {
        dispatchDomainEvent("hiring", EVENT_NAMES.hiring.applicationAccepted, {
          applicationId: vars.applicationId,
          teacherId: vars.teacherId!,
          jobId: vars.jobId!,
          acceptedAt: new Date().toISOString(),
        }).catch((e) => logDispatchFailure(EVENT_NAMES.hiring.applicationAccepted, e));
      }

      // Hiring signals (fire-and-forget, Phase 4.4)
      const signalMap: Record<string, any> = {
        withdrawn: { signalType: "application_withdrawn", actorType: "teacher" },
        rejected: { signalType: "application_rejected", actorType: "school" },
        hired: { signalType: "candidate_hired", actorType: "school" },
      };

      const mapped = signalMap[vars.newStatus];
      if (mapped) {
        createHiringSignal({
          ...mapped,
          applicationId: vars.applicationId,
          teacherId: vars.teacherId,
          jobId: vars.jobId,
          metadata: vars.newStatus === "rejected" && vars.rejectionReasonTermId
            ? { rejectionReasonTermId: vars.rejectionReasonTermId }
            : undefined,
        });
      } else if (!["applied"].includes(vars.newStatus)) {
        // Stage change (shortlisted, interview, offer)
        createHiringSignal({
          signalType: "application_stage_changed",
          actorType: "school",
          applicationId: vars.applicationId,
          teacherId: vars.teacherId,
          jobId: vars.jobId,
          metadata: { newStage: vars.newStatus },
        });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update application.", variant: "destructive" });
    },
  });
}
