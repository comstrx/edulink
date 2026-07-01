/**
 * Pipeline — Visual Kanban board over application statuses.
 *
 * Fetches all applicants for the selected job in a single query,
 * then groups client-side by status into pipeline columns.
 *
 * Stage transitions use the existing useUpdateApplicationStatus mutation.
 * Reject flow is unchanged — uses RejectApplicationDialog with mandatory reason.
 */

import { useState, useMemo } from "react";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";
import { PipelineCard, type PipelineApplicant } from "@/components/hiring/PipelineCard";
import { useInterviewsByJobMap } from "@/hooks/useInterviewsByJobMap";
import { useSchoolJobs } from "@/hooks/useSchoolJobs";
import { useJobApplicants } from "@/hooks/useJobApplicants";

/* ─── Pipeline Column ─── */

function PipelineColumn({
  label,
  color,
  applicants,
  jobId,
  interviewMap,
}: {
  label: string;
  color: string;
  applicants: PipelineApplicant[];
  jobId: string;
  interviewMap?: Map<string, any[]>;
}) {
  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px] w-[260px] shrink-0">
      {/* Column header */}
      <div className={cn("rounded-t-lg border-t-[3px] bg-muted/30 px-3 py-2.5 flex items-center justify-between", color)}>
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
          {applicants.length}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2 min-h-[120px]">
          {applicants.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-6">No applicants</p>
          ) : (
            applicants.map((a) => (
              <PipelineCard key={a.id} applicant={a} jobId={jobId} interviews={interviewMap?.get(a.id)} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── Page ─── */

const Pipeline = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const { data: jobs = [], isLoading: jobsLoading } = useSchoolJobs(workspace?.schoolId);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();

  const activeJobId = selectedJobId ?? jobs[0]?.id;
  const { data: applicants = [], isLoading: applicantsLoading } = useJobApplicants(activeJobId);
  const { data: interviewMap } = useInterviewsByJobMap(activeJobId);

  // Group by status client-side
  const grouped = useMemo(() => {
    const map = new Map<string, PipelineApplicant[]>();
    PIPELINE_STAGES.forEach((s) => map.set(s.status, []));
    applicants.forEach((a) => {
      const bucket = map.get(a.status);
      if (bucket) bucket.push(a);
      else {
        // Unknown status → put in applied
        map.get("applied")?.push(a);
      }
    });
    return map;
  }, [applicants]);

  return (
    <>
      <title>Pipeline — Hiring Pipeline Board | EduLink</title>

      <div className="max-w-full mx-auto px-6 pt-6">
        <SchoolBreadcrumb items={[
          { label: "Hiring", to: "/app/school/hiring/overview" },
          { label: "Pipeline" },
        ]} />
      </div>

      {/* Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-muted/25 to-background">
        <div className="max-w-full mx-auto px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutGrid className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Hiring Pipeline</h1>
              <p className="text-xs text-muted-foreground">
                Visualize and manage applicants across hiring stages
              </p>
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
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="px-4 py-5 h-[calc(100vh-180px)]">
        {jobsLoading ? (
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[400px] w-[260px] rounded-lg" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">No jobs posted yet</h3>
              <p className="text-sm text-muted-foreground">Create a job to start tracking applicants.</p>
            </CardContent>
          </Card>
        ) : applicantsLoading ? (
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[400px] w-[260px] rounded-lg" />
            ))}
          </div>
        ) : (
          <ScrollArea className="w-full h-full">
            <div className="flex gap-3 pb-4 h-full">
              {PIPELINE_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage.status}
                  label={stage.label}
                  color={stage.color}
                  applicants={grouped.get(stage.status) ?? []}
                  jobId={activeJobId!}
                  interviewMap={interviewMap}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </>
  );
};

export default Pipeline;
