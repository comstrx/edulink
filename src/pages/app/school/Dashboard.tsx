import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useEffectiveEntitlements } from "@/hooks/useEffectiveEntitlements";
import { useSchoolDashboardStats } from "@/hooks/useSchoolDashboardStats";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users, GraduationCap, Clock, Building, Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/training/StatCard";
import PriorityActions from "@/components/school/dashboard/PriorityActions";
import ModuleSnapshots from "@/components/school/dashboard/ModuleSnapshots";
import DashboardEmptyState from "@/components/school/dashboard/DashboardEmptyState";
import SchoolGrowthSummaryCard from "@/components/school/dashboard/SchoolGrowthSummaryCard";
import TeamGapInsights from "@/components/school/dashboard/TeamGapInsights";
import HiringIntelligenceSummary from "@/components/school/intelligence/HiringIntelligenceSummary";
import TeamIntelligenceSummary from "@/components/school/intelligence/TeamIntelligenceSummary";
import SchoolIntelligenceAlerts from "@/components/school/intelligence/SchoolIntelligenceAlerts";
import TeamWeakAreasCard from "@/components/school/intelligence/TeamWeakAreasCard";
import TeamRecommendationInsights from "@/components/school/intelligence/TeamRecommendationInsights";

const SchoolDashboard = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const { canUseHiring, canUseTraining, loading: entLoading } = useEffectiveEntitlements();
  const { data: stats, isLoading } = useSchoolDashboardStats();
  const navigate = useNavigate();

  if (isLoading || entLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  const s = stats ?? {
    activeJobs: 0, totalApplicants: 0, pendingReviewApplicants: 0,
    pendingInterviews: 0, teamMembers: 0, pendingInvitations: 0,
    activeAssignments: 0, overdueAssignments: 0, recentCompletions: 0,
    jobsWithNoApplicants: 0,
  };

  const isEmpty =
    s.activeJobs === 0 && s.totalApplicants === 0 && s.teamMembers === 0 &&
    s.activeAssignments === 0 && s.recentCompletions === 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{workspace?.schoolName ?? "School"}</h1>
        <p className="text-sm text-muted-foreground">What needs your attention today</p>
      </div>

      {isEmpty ? (
        <DashboardEmptyState canUseHiring={canUseHiring} canUseTraining={canUseTraining} />
      ) : (
        <div className="space-y-2">
          {/* 1. Intelligence Anchor — WHY */}
          <div className="flex items-center gap-2 text-sm font-medium text-primary/80 pl-1">
            <Brain className="h-4 w-4" />
            Based on your team's current gaps and activity
            <Badge variant="outline" className="ml-auto text-[10px] px-2 py-0 border-primary/30 text-primary/70">
              AI Insights Active
            </Badge>
          </div>

          {/* 2. Priority Actions — WHAT (hero block) */}
          <div className="mb-2">
            <PriorityActions stats={s} canUseHiring={canUseHiring} canUseTraining={canUseTraining} />
          </div>

          {/* 2.5 Intelligence Alerts */}
          {workspace?.schoolId && (
            <div className="pt-1">
              <SchoolIntelligenceAlerts schoolId={workspace.schoolId} />
            </div>
          )}

          {/* 2.6 Intelligence Summaries */}
          {workspace?.schoolId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {canUseHiring && <HiringIntelligenceSummary schoolId={workspace.schoolId} />}
              <TeamIntelligenceSummary schoolId={workspace.schoolId} />
            </div>
          )}

          {/* 3. KPI Row — STATUS (de-emphasized) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 opacity-80">
            {canUseHiring && (
              <StatCard label="Active Jobs" value={s.activeJobs} icon={Briefcase} iconCircle />
            )}
            {canUseHiring && (
              <StatCard label="Applicants" value={s.totalApplicants} icon={Users} iconCircle />
            )}
            <StatCard label="Team Members" value={s.teamMembers} icon={Building} iconCircle />
            {canUseTraining && (
              <StatCard label="Active Training" value={s.activeAssignments} icon={GraduationCap} iconCircle />
            )}
            {canUseTraining && (
              <StatCard
                label="Overdue"
                value={s.overdueAssignments}
                icon={Clock}
                iconCircle
                valueClassName={s.overdueAssignments > 0 ? "text-destructive" : "text-foreground"}
              />
            )}
          </div>

          {/* 4. Gap Insights + Weak Areas — DEEP WHY */}
          {workspace?.schoolId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <TeamGapInsights schoolId={workspace.schoolId} />
              <TeamWeakAreasCard schoolId={workspace.schoolId} />
            </div>
          )}

          {/* 5. Team Recommendation Insights + Growth Summary */}
          {workspace?.schoolId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <TeamRecommendationInsights schoolId={workspace.schoolId} />
              {canUseHiring && canUseTraining && (
                <SchoolGrowthSummaryCard schoolId={workspace.schoolId} />
              )}
            </div>
          )}

          {/* 6. Module Snapshots — OVERVIEW (passive) */}
          <div className="pt-6">
            <ModuleSnapshots stats={s} canUseHiring={canUseHiring} canUseTraining={canUseTraining} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolDashboard;
