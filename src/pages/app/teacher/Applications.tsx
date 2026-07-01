import { useSearchParams, Link } from "react-router-dom";
import { useTeacherApplications, useExistingApplication, useApplyToJob, useUpdateApplicationStatus } from "@/hooks/useApplications";
import { useApplicationRejectionReasons } from "@/hooks/useApplicationRejectionReasons";
import { useBatchMatchSnapshots } from "@/hooks/useBatchMatchSnapshots";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { useTalentIntelligenceProfile } from "@/intelligence/talent/hooks/useTalentIntelligenceProfile";
import TeacherContextBar from "@/components/teacher/TeacherContextBar";
import { usePublicJobDetail } from "@/hooks/usePublicJobs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, ExternalLink, AlertTriangle, ArrowLeft, Sparkles, TrendingUp } from "lucide-react";
import { ApplicationStatusBadge } from "@/components/teacher/ApplicationStatusBadge";
import { ApplicationGuidance } from "@/components/teacher/ApplicationGuidance";
import { ApplicationMatchLabel, ApplicationIntelligenceContext } from "@/components/teacher/ApplicationIntelligenceContext";
import { format } from "date-fns";

/* ------------------------------------------------------------------ */
/* Apply Panel — shown when ?jobId= is present                        */
/* ------------------------------------------------------------------ */
function ApplyPanel({ jobId }: { jobId: string }) {
  const { data: job, isLoading: jobLoading } = usePublicJobDetail(jobId);
  const { data: existing, isLoading: checkLoading } = useExistingApplication(jobId);
  const applyMutation = useApplyToJob();
  const updateMutation = useUpdateApplicationStatus();

  const isLoading = jobLoading || checkLoading;

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card className="mb-6 border-destructive/30">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Job not available</p>
            <p className="text-xs text-muted-foreground">This job may have expired or been removed.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link to="/jobs"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Browse Jobs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasApplied = existing?.id && existing.status === "applied";
  const hasWithdrawn = existing?.id && existing.status === "withdrawn";
  const teacherProfileId = existing?.teacherProfileId;
  const busy = applyMutation.isPending || updateMutation.isPending;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Apply to: {job.title}
        </CardTitle>
        <CardDescription>{job.location} {job.salary ? `· ${job.salary}` : ""}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 flex items-center gap-3">
        {hasApplied && (
          <>
            <ApplicationStatusBadge status="applied" />
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => updateMutation.mutate({ applicationId: existing.id!, newStatus: "withdrawn" })}
            >
              Withdraw
            </Button>
          </>
        )}
        {hasWithdrawn && (
          <>
            <ApplicationStatusBadge status="withdrawn" />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => updateMutation.mutate({ applicationId: existing.id!, newStatus: "applied" })}
            >
              Re-apply
            </Button>
          </>
        )}
        {!existing?.id && teacherProfileId && (
          <Button
            disabled={busy}
            onClick={() => applyMutation.mutate({ jobId, teacherProfileId })}
          >
            Apply Now
          </Button>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link to={`/jobs/${jobId}`}><ExternalLink className="h-3.5 w-3.5 mr-1" /> View Job</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main Applications Page                                              */
/* ------------------------------------------------------------------ */
const Applications = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const { data: teacherProfileId } = useTeacherProfileId();
  const { data: applications, isLoading } = useTeacherApplications();
  const updateMutation = useUpdateApplicationStatus();

  const rejectedAppIds = (applications ?? [])
    .filter((a) => a.status === "rejected")
    .map((a) => a.id);
  const { data: rejectionReasonMap } = useApplicationRejectionReasons(rejectedAppIds);

  const jobIds = (applications ?? []).map((a) => a.job_id);
  const { data: matchMap } = useBatchMatchSnapshots(teacherProfileId ?? undefined, jobIds);
  const { data: talentProfile } = useTalentIntelligenceProfile(teacherProfileId ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
        <p className="text-sm text-muted-foreground">Track and manage your job applications</p>
      </div>

      {jobId && <ApplyPanel jobId={jobId} />}

      <TeacherContextBar
        teacherId={teacherProfileId ?? undefined}
        contextMessage="Your readiness summary and focus area."
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button asChild size="sm">
          <Link to="/app/teacher/talent-profile">
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> Professional Intelligence
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/teacher/recommendations">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> See how to improve
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !applications || applications.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No applications yet</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/jobs">Browse Jobs</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Fit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {app.job?.title ?? "Unknown Job"}
                    </TableCell>
                    <TableCell>
                      <ApplicationMatchLabel match={matchMap?.[app.job_id]} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <ApplicationStatusBadge status={app.status} />
                        <ApplicationGuidance
                          status={app.status}
                          matchScore={matchMap?.[app.job_id]?.score ?? null}
                          rejectionReason={rejectionReasonMap?.[app.id] ?? null}
                        />
                        <ApplicationIntelligenceContext
                          match={matchMap?.[app.job_id]}
                          profile={talentProfile}
                          status={app.status}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(app.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/jobs/${app.job_id}`}><ExternalLink className="h-3.5 w-3.5 mr-1" /> View</Link>
                      </Button>
                      {app.status === "applied" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ applicationId: app.id, newStatus: "withdrawn" })}
                        >
                          Withdraw
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Applications;
