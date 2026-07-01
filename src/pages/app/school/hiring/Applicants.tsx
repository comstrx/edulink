/**
 * Applicants — School-facing applicant list with intelligence signals.
 *
 * Displays applicants per job with Match, CRI, Verified, and Gap badges.
 * Match remains teacher×job scoped.
 */

import { useState } from "react";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";
import { useUpdateApplicationStatus, type ApplicationStatus } from "@/hooks/useApplications";
import {
  getForwardStage,
  getForwardActionLabel,
  canReject as canRejectFn,
  isTerminal,
} from "@/lib/pipeline-stages";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Eye, Briefcase, Clock, CheckCircle2,
  XCircle, FileText, ChevronRight, Ban, ArrowRight, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ApplicantIntelligenceRow from "@/components/intelligence/ApplicantIntelligenceRow";
import ApplicantTalentSummary from "@/components/intelligence/ApplicantTalentSummary";
import ApplicantDecisionPanel from "@/components/intelligence/ApplicantDecisionPanel";
import { RejectApplicationDialog } from "@/components/hiring/RejectApplicationDialog";
import { ScheduleInterviewDialog } from "@/components/hiring/ScheduleInterviewDialog";
import { InterviewIndicator } from "@/components/hiring/InterviewIndicator";
import { ApplicationInterviewSection } from "@/components/hiring/ApplicationInterviewSection";
import { useInterviewsByJobMap, type InterviewSummary } from "@/hooks/useInterviewsByJobMap";
import { useSchoolJobs } from "@/hooks/useSchoolJobs";
import { useJobApplicants, type JobApplicantRow } from "@/hooks/useJobApplicants";

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  applied: { label: "Applied", className: "bg-primary/10 text-primary border-primary/20", icon: FileText },
  shortlisted: { label: "Shortlisted", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: CheckCircle2 },
  interview: { label: "Interview", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800", icon: Clock },
  offer: { label: "Offer", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: CheckCircle2 },
  hired: { label: "Hired", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800", icon: CheckCircle2 },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground border-border", icon: XCircle },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800", icon: XCircle },
};

const ApplicantCard = ({ applicant, jobId, interviews }: { applicant: JobApplicantRow; jobId: string; interviews?: InterviewSummary[] }) => {
  const teacher = applicant.teacher;
  const initials = teacher?.full_name
    ? teacher.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const subjectIds = teacher?.subject_ids ?? [];
  const countryId = teacher?.country_id;
  const allIds = [...subjectIds, ...(countryId ? [countryId] : [])];
  const { data: nameMap } = useTaxonomyNames(allIds);
  const resolve = (id: string) => nameMap?.[id] ?? "";

  const subjects = subjectIds.map(resolve).filter(Boolean);
  const country = countryId ? resolve(countryId) : null;

  const statusConfig = STATUS_CONFIG[applicant.status] ?? STATUS_CONFIG.applied;
  const StatusIcon = statusConfig.icon;

  const [rejectOpen, setRejectOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const updateMutation = useUpdateApplicationStatus();

  const currentStatus = applicant.status as ApplicationStatus;
  const nextStage = getForwardStage(currentStatus);
  const forwardLabel = getForwardActionLabel(currentStatus);
  const showReject = canRejectFn(currentStatus);
  const terminal = isTerminal(currentStatus);
  const showSchedule = !terminal && currentStatus !== "hired";

  return (
    <>
      <Card className="hover:shadow-md hover:border-border transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Avatar */}
            <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm shrink-0">
              {teacher?.avatar_url && <AvatarImage src={teacher.avatar_url} alt={teacher?.full_name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {teacher?.full_name ?? "Unknown Teacher"}
                </h3>
                <Badge variant="outline" className={cn("text-[10px] h-[18px] px-1.5 gap-0.5 font-medium border shrink-0", statusConfig.className)}>
                  <StatusIcon className="h-2.5 w-2.5" />
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Subject & location */}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {subjects.length > 0 && (
                  <span className="truncate">{subjects.slice(0, 2).join(", ")}</span>
                )}
                {country && (
                  <>
                    <span>•</span>
                    <span>{country}</span>
                  </>
                )}
                {teacher?.years_of_experience != null && teacher.years_of_experience > 0 && (
                  <>
                    <span>•</span>
                    <span>{teacher.years_of_experience}y exp</span>
                  </>
                )}
              </div>

              {/* Intelligence badges — Match is teacher×job scoped */}
              {teacher && (
                <>
                  <ApplicantIntelligenceRow teacherId={teacher.id} jobId={jobId} />
                  <ApplicantTalentSummary teacherId={teacher.id} />
                  <ApplicantDecisionPanel teacherId={teacher.id} />
                </>
              )}

              {/* Interview indicator */}
              <InterviewIndicator interviews={interviews} />

              {/* Interview history (expanded) */}
              <ApplicationInterviewSection interviews={interviews} />

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                <Clock className="h-3 w-3" />
                Applied {format(new Date(applicant.created_at), "MMM d, yyyy")}
              </div>
            </div>

            {/* Actions */}
            <div className="shrink-0 hidden md:flex flex-col items-end gap-1.5">
              <Button asChild size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5">
                <Link to={`/teachers/${teacher?.id}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-3 w-3" />
                  View Profile
                </Link>
              </Button>
              {!terminal && nextStage && forwardLabel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1 px-2.5"
                  onClick={() => {
                    updateMutation.mutate({
                      applicationId: applicant.id,
                      newStatus: nextStage,
                      teacherId: applicant.teacher_id,
                      jobId: applicant.job_id,
                    });
                  }}
                  disabled={updateMutation.isPending}
                >
                  <ArrowRight className="h-3 w-3" />
                  {forwardLabel}
                </Button>
              )}
              {showSchedule && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1 px-2.5"
                  onClick={() => setScheduleOpen(true)}
                >
                  <CalendarDays className="h-3 w-3" />
                  Schedule Interview
                </Button>
              )}
              {showReject && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setRejectOpen(true)}
                  disabled={updateMutation.isPending}
                >
                  <Ban className="h-3 w-3" />
                  Reject
                </Button>
              )}
            </div>
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
        applicantName={teacher?.full_name ?? "Unknown Teacher"}
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
            { onSuccess: () => setRejectOpen(false) }
          );
        }}
      />
    </>
  );
};

const Applicants = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const { data: jobs = [], isLoading: jobsLoading } = useSchoolJobs(workspace?.schoolId);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);

  const activeJobId = selectedJobId ?? jobs[0]?.id;
  const { data: applicants = [], isLoading: applicantsLoading } = useJobApplicants(activeJobId);
  const { data: interviewMap } = useInterviewsByJobMap(activeJobId);

  const selectedJob = jobs.find((j) => j.id === activeJobId);
  const appliedCount = applicants.filter((a) => a.status === "applied").length;

  return (
    <>
      <title>Applicants — Review Job Applications | EduLink</title>

      <div className="border-b border-border/50 bg-gradient-to-b from-muted/25 to-background">
        <div className="max-w-5xl mx-auto px-6 pt-6 pb-5">
          <SchoolBreadcrumb items={[
            { label: "Hiring", to: "/app/school/hiring/overview" },
            { label: "Applicants" },
          ]} />
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Applicants</h1>
              <p className="text-xs text-muted-foreground">Review applications with intelligence insights</p>
            </div>
          </div>

          {/* Job selector */}
          {jobs.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">Job:</span>
              <Select value={activeJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-[320px] h-9 text-sm border-border/60 bg-background shadow-sm">
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{job.title}</span>
                        <Badge variant="outline" className="text-[9px] h-[16px] px-1 ml-1">
                          {job.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {appliedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {appliedCount} active
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5">
        {jobsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-muted-foreground/60" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-foreground">No jobs posted yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Create a job listing to start receiving applications from qualified teachers.
              </p>
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/app/school/hiring/jobs">
                  Post a Job
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : applicantsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : applicants.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center">
                  <Users className="h-6 w-6 text-muted-foreground/60" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-foreground">No applicants yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {selectedJob ? `"${selectedJob.title}" hasn't received any applications yet.` : "Select a job to view applicants."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {applicants.map((applicant) => (
              <ApplicantCard key={applicant.id} applicant={applicant} jobId={activeJobId!} interviews={interviewMap?.get(applicant.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Applicants;
