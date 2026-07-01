/**
 * Hiring Analytics — School-facing hiring performance metrics.
 *
 * Phase 4.5 — Derived read-only analytics from hiring_signals.
 * No workflow coupling, no writes, no heavy computation.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import { useHiringAnalytics } from "@/hooks/useHiringAnalytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Briefcase,
  Users,
  CalendarDays,
  UserCheck,
  TrendingUp,
  XCircle,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── School jobs query ─── */

function useSchoolJobs(schoolProfileId: string | undefined) {
  return useQuery({
    queryKey: ["school-jobs-analytics", schoolProfileId],
    enabled: !!schoolProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status")
        .eq("school_id", schoolProfileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ─── Stat Card ─── */

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconClassName?: string;
}

function StatCard({ label, value, subtitle, icon: Icon, iconClassName }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", iconClassName ?? "bg-primary/10")}>
            <Icon className={cn("h-4.5 w-4.5", iconClassName ? "text-current" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Page ─── */

const HiringAnalytics = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const { data: jobs = [], isLoading: jobsLoading } = useSchoolJobs(workspace?.schoolId);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();

  const filterJobId = selectedJobId === "all" ? undefined : selectedJobId;
  const { data: metrics, isLoading: metricsLoading } = useHiringAnalytics({
    jobId: filterJobId,
  });

  const loading = jobsLoading || metricsLoading;

  const formatRate = (rate: number) => {
    if (rate === 0) return "0%";
    return `${(rate * 100).toFixed(1)}%`;
  };

  return (
    <>
      <title>Hiring Analytics — Performance Insights | EduLink</title>

      <div className="max-w-5xl mx-auto px-6 pt-6">
        <SchoolBreadcrumb items={[
          { label: "Hiring", to: "/app/school/hiring/overview" },
          { label: "Analytics" },
        ]} />
      </div>

      {/* Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-muted/25 to-background">
        <div className="max-w-5xl mx-auto px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Hiring Analytics</h1>
              <p className="text-xs text-muted-foreground">Performance insights derived from hiring activity</p>
            </div>
          </div>

          {/* Job filter */}
          {jobs.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">Filter:</span>
              <Select value={selectedJobId ?? "all"} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-[320px] h-9 text-sm border-border/60 bg-background shadow-sm">
                  <SelectValue placeholder="All jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>All Jobs</span>
                    </div>
                  </SelectItem>
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

      {/* Metrics */}
      <div className="max-w-5xl mx-auto px-6 py-5">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : !metrics ? (
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">No analytics data yet</h3>
              <p className="text-sm text-muted-foreground">
                Hiring activity signals will appear here as your hiring process generates data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Primary metrics */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Activity</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Applications"
                  value={metrics.applicationsCount}
                  subtitle="Total received"
                  icon={Users}
                />
                <StatCard
                  label="Interviews"
                  value={metrics.interviewsCount}
                  subtitle="Scheduled"
                  icon={CalendarDays}
                  iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                />
                <StatCard
                  label="Hires"
                  value={metrics.hiresCount}
                  subtitle="Completed"
                  icon={UserCheck}
                  iconClassName="bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                />
                <StatCard
                  label="Rejections"
                  value={metrics.rejectionsCount}
                  subtitle="Total"
                  icon={XCircle}
                  iconClassName="bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                />
              </div>
            </div>

            {/* Derived rates */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Conversion Rates</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Interview Rate"
                  value={formatRate(metrics.interviewRate)}
                  subtitle="Applications → Interviews"
                  icon={TrendingUp}
                  iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                />
                <StatCard
                  label="Hire Rate"
                  value={formatRate(metrics.hireRate)}
                  subtitle="Applications → Hires"
                  icon={TrendingUp}
                  iconClassName="bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                />
                <StatCard
                  label="Withdrawal Rate"
                  value={formatRate(metrics.applicationsCount > 0 ? metrics.withdrawalsCount / metrics.applicationsCount : 0)}
                  subtitle="Applications → Withdrawals"
                  icon={ArrowDownRight}
                  iconClassName="bg-muted text-muted-foreground"
                />
              </div>
            </div>

            {/* Empty state hint */}
            {metrics.applicationsCount === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hiring signals recorded yet. Metrics will populate as applications, interviews, and hires are processed.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default HiringAnalytics;
