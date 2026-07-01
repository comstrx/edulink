/**
 * Interviews — School-facing interview scheduling & management.
 *
 * Phase 4.3C — Grouped by job, with View Application navigation.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import { useUpdateInterview, type InterviewRow } from "@/hooks/useInterviews";
import { ScheduleInterviewDialog } from "@/components/hiring/ScheduleInterviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  Briefcase,
  Video,
  Pencil,
  XCircle,
  ExternalLink,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSchoolInterviews, type InterviewWithContext } from "@/hooks/useSchoolInterviews";

/* ─── Status badge ─── */

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
  cancelled: "bg-muted text-muted-foreground border-border",
};

/* ─── Page ─── */

const Interviews = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const { data: interviews = [], isLoading } = useSchoolInterviews(workspace?.schoolId);

  const [editInterview, setEditInterview] = useState<InterviewRow | null>(null);
  const updateMutation = useUpdateInterview();

  const handleCancel = (interview: InterviewRow) => {
    updateMutation.mutate(
      { interviewId: interview.id, status: "cancelled" },
      {
        onSuccess: () => {
          console.info("[interviews] interview_cancelled", { interviewId: interview.id });
        },
      },
    );
  };

  // Group interviews by job, sorted by most recent interview per group
  const groupedByJob = useMemo(() => {
    const map = new Map<string, { jobTitle: string; jobId: string; interviews: InterviewWithContext[] }>();
    for (const iv of interviews) {
      const ctx = iv as InterviewWithContext;
      if (!map.has(ctx.job_id)) {
        map.set(ctx.job_id, { jobTitle: ctx.job_title, jobId: ctx.job_id, interviews: [] });
      }
      map.get(ctx.job_id)!.interviews.push(ctx);
    }
    // Sort groups by most recent interview
    const groups = [...map.values()];
    groups.sort((a, b) => {
      const aMax = Math.max(...a.interviews.map((i) => new Date(i.scheduled_at).getTime()));
      const bMax = Math.max(...b.interviews.map((i) => new Date(i.scheduled_at).getTime()));
      return bMax - aMax;
    });
    return groups;
  }, [interviews]);

  const scheduledCount = interviews.filter((i) => i.status === "scheduled").length;

  return (
    <>
      <title>Interviews — Schedule & Manage | EduLink</title>

      <div className="max-w-5xl mx-auto px-6 pt-6">
        <SchoolBreadcrumb items={[
          { label: "Hiring", to: "/app/school/hiring/overview" },
          { label: "Interviews" },
        ]} />
      </div>

      {/* Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-muted/25 to-background">
        <div className="max-w-5xl mx-auto px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Interviews</h1>
              <p className="text-xs text-muted-foreground">Schedule and manage candidate interviews</p>
            </div>
            {scheduledCount > 0 && (
              <Badge variant="secondary" className="text-xs ml-auto">
                {scheduledCount} upcoming
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : interviews.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">No interviews yet</h3>
              <p className="text-sm text-muted-foreground">
                Schedule interviews from the Applicants or Pipeline view.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedByJob.map((group) => (
              <div key={group.jobId}>
                {/* Job group header */}
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">{group.jobTitle}</h2>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {group.interviews.filter((i) => i.status === "scheduled").length} scheduled
                  </Badge>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Meeting Link</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.interviews.map((interview) => {
                        const isScheduled = interview.status === "scheduled";
                        return (
                          <TableRow key={interview.id}>
                            <TableCell className="font-medium text-sm">{interview.teacher_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(interview.scheduled_at), "MMM d, yyyy · h:mm a")}
                            </TableCell>
                            <TableCell>
                              {interview.meeting_link ? (
                                <a
                                  href={interview.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <Video className="h-3 w-3" />
                                  Join
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="text-xs text-muted-foreground truncate">
                                {interview.notes || "—"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] capitalize", STATUS_STYLES[interview.status] ?? "")}
                              >
                                {interview.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* View Application */}
                                <Button
                                  asChild
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs gap-1 px-2"
                                  onClick={() => console.info("[interviews] interview_navigation_to_application", { interviewId: interview.id, applicationId: interview.application_id })}
                                >
                                  <Link to={`/app/school/hiring/applicants?highlight=${interview.application_id}`}>
                                    <Eye className="h-3 w-3" />
                                    Application
                                  </Link>
                                </Button>
                                {isScheduled && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs gap-1 px-2"
                                      onClick={() => setEditInterview(interview)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs gap-1 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleCancel(interview)}
                                      disabled={updateMutation.isPending}
                                    >
                                      <XCircle className="h-3 w-3" />
                                      Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {editInterview && (
        <ScheduleInterviewDialog
          open={!!editInterview}
          onOpenChange={(open) => !open && setEditInterview(null)}
          existingInterview={editInterview}
          teacherName={(editInterview as any).teacher_name}
        />
      )}
    </>
  );
};

export default Interviews;
