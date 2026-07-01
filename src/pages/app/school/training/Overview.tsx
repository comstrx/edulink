import { Link } from "react-router-dom";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import StatCard from "@/components/training/StatCard";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import {
  GraduationCap, AlertTriangle, CheckCircle2, Award,
  Target, Users, ArrowRight, BookOpen, ShieldCheck, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSchoolTrainingStats,
  useSchoolOverdueCount,
  useSchoolOverdueAssignments,
} from "@/hooks/useSchoolTrainingStats";

const SchoolTrainingOverview = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  // Canonical training stats — no inline aggregation
  const { data: teamStats, isLoading: teamLoading } = useSchoolTrainingStats();
  const { data: overdueCount, isLoading: overdueCountLoading } = useSchoolOverdueCount();
  const { data: overdueItems = [], isLoading: overdueLoading } = useSchoolOverdueAssignments();

  const isLoading = teamLoading || overdueLoading || overdueCountLoading;

  return (
    <>
      <SchoolTrainingSubNav />
      <div className="space-y-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <SchoolBreadcrumb items={[{ label: "Training" }]} />
        <TrainingHeader
          title="Workforce Development Dashboard"
          icon={GraduationCap}
          description="Monitor team learning progress, compliance, and professional growth"
          rootTo="/app/school/training/overview"
        />

        {/* Team Learning Overview */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Team Members" value={String(teamStats?.totalMembers ?? 0)} icon={Users} iconCircle />
            <StatCard label="Active Assignments" value={String(teamStats?.activeAssignments ?? 0)} icon={BookOpen} iconCircle />
            <StatCard label="Overdue Items" value={String(overdueCount ?? 0)} icon={AlertTriangle} iconCircle valueClassName={(overdueCount ?? 0) > 0 ? "text-destructive" : undefined} />
            <StatCard label="Credentials Earned" value={String(teamStats?.credentialsEarned ?? 0)} icon={Award} iconCircle />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overdue Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Overdue Items
              </CardTitle>
              <CardDescription>Staff members with past-due training requirements</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : overdueItems.length > 0 ? (
                <div className="space-y-3">
                  {overdueItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.item_title ?? "Training Item"}</p>
                        <p className="text-xs text-muted-foreground">{item.teacher_name ?? "Teacher"}</p>
                      </div>
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" /> Overdue
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <TrainingEmptyState icon={CheckCircle2} message="All clear!" hint="No overdue training items for your team." />
              )}
            </CardContent>
          </Card>

          {/* Completed Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Completion Summary
              </CardTitle>
              <CardDescription>Completed training assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center rounded-md border border-border py-4">
                    <p className="text-2xl font-bold text-foreground">{teamStats?.completedAssignments ?? 0}</p>
                    <Badge variant="default" className="mt-1 text-xs">Completed</Badge>
                  </div>
                  <div className="flex-1 text-center rounded-md border border-border py-4">
                    <p className="text-2xl font-bold text-foreground">{teamStats?.activeAssignments ?? 0}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">In Progress</Badge>
                  </div>
                  <div className="flex-1 text-center rounded-md border border-border py-4">
                    <p className="text-2xl font-bold text-foreground">{teamStats?.credentialsEarned ?? 0}</p>
                    <Badge variant="outline" className="mt-1 text-xs">Credentials</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Assign Training", to: "/app/school/training/assign" },
                { label: "View Compliance", to: "/app/school/training/compliance" },
                { label: "Manage Credentials", to: "/app/school/training/credentials" },
                { label: "Browse Catalog", to: "/app/school/training/catalog" },
                { label: "Manage Cohorts", to: "/app/school/training/cohorts" },
              ].map((action) => (
                <Button key={action.label} variant="outline" size="sm" asChild>
                  <Link to={action.to}>
                    {action.label}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SchoolTrainingOverview;
