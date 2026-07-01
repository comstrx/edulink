import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";
import { useUpdateApplicationStatus, type ApplicationStatus } from "@/hooks/useApplications";
import { RejectApplicationDialog } from "@/components/hiring/RejectApplicationDialog";
import { ScheduleInterviewDialog } from "@/components/hiring/ScheduleInterviewDialog";
import ApplicantIntelligenceRow from "@/components/intelligence/ApplicantIntelligenceRow";
import {
  getForwardStage,
  getForwardActionLabel,
  canReject as canRejectStatus,
  isTerminal,
} from "@/lib/pipeline-stages";
import { Eye, ArrowRight, Ban, CalendarDays } from "lucide-react";
import { InterviewIndicator } from "@/components/hiring/InterviewIndicator";
import type { InterviewSummary } from "@/hooks/useInterviewsByJobMap";
import type { JobApplicantRow } from "@/hooks/useJobApplicants";

export type PipelineApplicant = JobApplicantRow;

interface PipelineCardProps {
  applicant: PipelineApplicant;
  jobId: string;
  interviews?: InterviewSummary[];
}

export function PipelineCard({ applicant, jobId, interviews }: PipelineCardProps) {
  const teacher = applicant.teacher;
  const initials = teacher?.full_name
    ? teacher.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const subjectIds = teacher?.subject_ids ?? [];
  const allIds = [...subjectIds, ...(teacher?.country_id ? [teacher.country_id] : [])];
  const { data: nameMap } = useTaxonomyNames(allIds);

  const subjects = subjectIds.map((id) => nameMap?.[id]).filter(Boolean).slice(0, 2);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const updateMutation = useUpdateApplicationStatus();

  const currentStatus = applicant.status as ApplicationStatus;
  const nextStage = getForwardStage(currentStatus);
  const forwardLabel = getForwardActionLabel(currentStatus);
  const showReject = canRejectStatus(currentStatus);
  const terminal = isTerminal(currentStatus);
  const showSchedule = !terminal && currentStatus !== "hired";

  const handleAdvance = () => {
    if (!nextStage) return;
    updateMutation.mutate({
      applicationId: applicant.id,
      newStatus: nextStage,
      teacherId: applicant.teacher_id,
      jobId: applicant.job_id,
    });
  };

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-150">
        <CardContent className="p-3 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              {teacher?.avatar_url && <AvatarImage src={teacher.avatar_url} alt={teacher?.full_name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {teacher?.full_name ?? "Unknown"}
              </p>
              {subjects.length > 0 && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {subjects.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Intelligence badges */}
          {teacher && <ApplicantIntelligenceRow teacherId={teacher.id} jobId={jobId} />}

          {/* Interview indicator */}
          <InterviewIndicator interviews={interviews} />

          {/* Actions — only show if not terminal */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Button asChild size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1">
              <Link to={`/teachers/${teacher?.id}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-3 w-3" /> View
              </Link>
            </Button>
            {!terminal && nextStage && forwardLabel && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={handleAdvance}
                disabled={updateMutation.isPending}
              >
                <ArrowRight className="h-3 w-3" />
                {forwardLabel}
              </Button>
            )}
            {showSchedule && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={() => setScheduleOpen(true)}
              >
                <CalendarDays className="h-3 w-3" />
                Interview
              </Button>
            )}
            {showReject && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setRejectOpen(true)}
                disabled={updateMutation.isPending}
              >
                <Ban className="h-3 w-3" /> Reject
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ScheduleInterviewDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        applicationId={applicant.id}
        teacherId={applicant.teacher_id}
        jobId={applicant.job_id}
        teacherName={teacher?.full_name}
        applicationStatus={currentStatus}
      />

      <RejectApplicationDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        applicantName={teacher?.full_name ?? "Unknown"}
        isPending={updateMutation.isPending}
        onConfirm={(reasonTermId) => {
          updateMutation.mutate(
            {
              applicationId: applicant.id,
              newStatus: "rejected",
              rejectionReasonTermId: reasonTermId,
              teacherId: applicant.teacher_id,
              jobId: applicant.job_id,
            },
            { onSuccess: () => setRejectOpen(false) },
          );
        }}
      />
    </>
  );
}
