import { useNavigate } from "react-router-dom";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useHiringOverviewStats } from "@/hooks/useHiringOverviewStats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/training/StatCard";
import {
  Briefcase, Users, CalendarCheck, AlertTriangle, Plus, Search,
  ArrowRight, Clock, FileText, Eye, ChevronRight,
} from "lucide-react";
import { buildPriorityItems, priorityStyles, type PriorityItem } from "@/lib/school/decision-system/buildPriorityItems";
import type { SchoolDashboardStats } from "@/hooks/useSchoolDashboardStats";
import HiringIntelligenceSummary from "@/components/school/intelligence/HiringIntelligenceSummary";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "Active", variant: "default" },
  draft: { label: "Draft", variant: "secondary" },
  closed: { label: "Closed", variant: "outline" },
};

const HiringOverview = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const { data: stats, isLoading } = useHiringOverviewStats();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading hiring overview…</p>
      </div>
    );
  }

  const s = stats ?? {
    activeJobs: 0, draftJobs: 0, closedJobs: 0,
    totalApplicants: 0, newApplicants: 0, shortlistedApplicants: 0,
    pendingReviewApplicants: 0, pendingInterviews: 0, interviewsThisWeek: 0,
    jobsWithNoApplicants: 0, recentJobs: [],
  };

  // Canonical decision system — filter to hiring domain only
  const canonicalStats: SchoolDashboardStats = {
    activeJobs: s.activeJobs,
    totalApplicants: s.totalApplicants,
    pendingReviewApplicants: s.pendingReviewApplicants,
    pendingInterviews: s.pendingInterviews,
    teamMembers: 0,
    pendingInvitations: 0,
    activeAssignments: 0,
    overdueAssignments: 0,
    recentCompletions: 0,
    jobsWithNoApplicants: s.jobsWithNoApplicants,
  };
  const hiringItems = buildPriorityItems(canonicalStats, true, false)
    .filter((item) => item.domain === "hiring");

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <SchoolBreadcrumb items={[{ label: "Hiring" }]} />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hiring Overview</h1>
        <p className="text-muted-foreground">
          Recruitment status for {workspace?.schoolName ?? "your school"}
        </p>
      </div>

      {/* 1️⃣ Hiring Pulse — KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Active Jobs" value={s.activeJobs} icon={Briefcase} iconCircle />
        <StatCard label="Draft Jobs" value={s.draftJobs} icon={Clock} iconCircle />
        <StatCard label="Total Applicants" value={s.totalApplicants} icon={Users} iconCircle />
        <StatCard label="New This Week" value={s.newApplicants} icon={FileText} iconCircle />
        <StatCard label="Pending Interviews" value={s.pendingInterviews} icon={CalendarCheck} iconCircle />
        <StatCard
          label="No Applicants"
          value={s.jobsWithNoApplicants}
          icon={AlertTriangle}
          iconCircle
          valueClassName={s.jobsWithNoApplicants > 0 ? "text-destructive" : "text-foreground"}
        />
      </div>

      {/* 1.5 — Hiring Intelligence Summary */}
      {workspace?.schoolId && (
        <HiringIntelligenceSummary schoolId={workspace.schoolId} />
      )}

      {/* 2️⃣ Priority Actions — Canonical Decision System */}
      {hiringItems.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hiringItems.map((item, i) => {
              const style = priorityStyles[item.priority];
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className={`flex items-start justify-between rounded-md p-3 border ${style.border}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-md bg-primary/10 p-1.5 shrink-0 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.problem}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.explanation}</p>
                      <p className="text-sm text-primary/80 mt-1 italic">Impact: {item.impact}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 ml-2"
                    onClick={() => navigate(item.path)}
                  >
                    {item.cta} <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 3️⃣ Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/app/school/hiring/jobs")} variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Post Job
        </Button>
        <Button onClick={() => navigate("/app/school/hiring/applicants")} variant="outline">
          <Eye className="mr-2 h-4 w-4" /> Review Applicants
        </Button>
        <Button onClick={() => navigate("/app/school/hiring/interviews")} variant="outline">
          <CalendarCheck className="mr-2 h-4 w-4" /> View Interviews
        </Button>
        <Button onClick={() => navigate("/app/school/hiring/talent-search")} variant="outline">
          <Search className="mr-2 h-4 w-4" /> Talent Search
        </Button>
      </div>

      {/* Snapshot Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 4️⃣ Jobs Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Jobs
            </CardTitle>
            <CardDescription>Current job postings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active</span>
              <span className="font-medium">{s.activeJobs}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Draft</span>
              <span className="font-medium">{s.draftJobs}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">No applicants</span>
              <span className={`font-medium ${s.jobsWithNoApplicants > 0 ? "text-destructive" : ""}`}>
                {s.jobsWithNoApplicants}
              </span>
            </div>
            {s.recentJobs.length > 0 && (
              <div className="pt-2 border-t space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Recent</p>
                {s.recentJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[60%]">{job.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_BADGE[job.status]?.variant ?? "outline"} className="text-xs">
                        {STATUS_BADGE[job.status]?.label ?? job.status}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{job.applicantCount} apps</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate("/app/school/hiring/jobs")}
            >
              Manage Jobs <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* 5️⃣ Applicants Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Applicants
            </CardTitle>
            <CardDescription>Candidate pipeline status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{s.totalApplicants}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Awaiting review</span>
              <span className={`font-medium ${s.pendingReviewApplicants > 0 ? "text-warning" : ""}`}>
                {s.pendingReviewApplicants}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shortlisted</span>
              <span className="font-medium">{s.shortlistedApplicants}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">New this week</span>
              <span className="font-medium">{s.newApplicants}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate("/app/school/hiring/applicants")}
            >
              View Applicants <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* 6️⃣ Interviews Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" /> Interviews
            </CardTitle>
            <CardDescription>Scheduling status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Upcoming</span>
              <span className="font-medium">{s.pendingInterviews}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">This week</span>
              <span className="font-medium">{s.interviewsThisWeek}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate("/app/school/hiring/interviews")}
            >
              View Interviews <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {s.activeJobs === 0 && s.draftJobs === 0 && s.totalApplicants === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hiring activity yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4 max-w-md">
              Start by posting your first job to attract qualified candidates to your school.
            </p>
            <Button onClick={() => navigate("/app/school/hiring/jobs")}>
              <Plus className="mr-2 h-4 w-4" /> Post Your First Job
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HiringOverview;
