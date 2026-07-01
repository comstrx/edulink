import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, GraduationCap, Users } from "lucide-react";
import type { SchoolDashboardStats } from "@/hooks/useSchoolDashboardStats";

interface SnapshotRowProps {
  label: string;
  value: number;
  attention?: boolean;
}

const SnapshotRow = ({ label, value, attention }: SnapshotRowProps) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium ${attention ? "text-destructive" : ""}`}>{value}</span>
  </div>
);

interface Props {
  stats: SchoolDashboardStats;
  canUseHiring: boolean;
  canUseTraining: boolean;
}

const ModuleSnapshots = ({ stats, canUseHiring, canUseTraining }: Props) => {
  const navigate = useNavigate();
  const s = stats;

  const hiringAttention = s.jobsWithNoApplicants > 0 || s.pendingInterviews > 0;
  const trainingAttention = s.overdueAssignments > 0;
  const teamAttention = s.pendingInvitations > 0;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-90">
      {canUseHiring && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Hiring
              {hiringAttention && (
                <span className="ml-auto text-xs font-normal text-destructive">
                  {s.jobsWithNoApplicants > 0
                    ? `${s.jobsWithNoApplicants} need${s.jobsWithNoApplicants === 1 ? "s" : ""} attention`
                    : `${s.pendingInterviews} pending`}
                </span>
              )}
            </CardTitle>
            <CardDescription>Recruitment overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SnapshotRow label="Active jobs" value={s.activeJobs} />
            <SnapshotRow label="Applicants" value={s.totalApplicants} />
            <SnapshotRow label="Pending interviews" value={s.pendingInterviews} attention={s.pendingInterviews > 0} />
            <SnapshotRow label="Jobs without applicants" value={s.jobsWithNoApplicants} attention={s.jobsWithNoApplicants > 0} />
            <p className="text-xs text-muted-foreground mt-2 text-center cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/app/school/hiring/overview")}>
              View details →
            </p>
          </CardContent>
        </Card>
      )}

      {canUseTraining && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" /> Training
              {trainingAttention && (
                <span className="ml-auto text-xs font-normal text-destructive">
                  {s.overdueAssignments} overdue
                </span>
              )}
            </CardTitle>
            <CardDescription>Professional development</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SnapshotRow label="Active assignments" value={s.activeAssignments} />
            <SnapshotRow label="Overdue" value={s.overdueAssignments} attention={s.overdueAssignments > 0} />
            <SnapshotRow label="Completions" value={s.recentCompletions} />
            <p className="text-xs text-muted-foreground mt-2 text-center cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/app/school/training/overview")}>
              View details →
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Team
            {teamAttention && (
              <span className="ml-auto text-xs font-normal text-destructive">
                {s.pendingInvitations} pending
              </span>
            )}
          </CardTitle>
          <CardDescription>Staff & invitations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SnapshotRow label="Active members" value={s.teamMembers} />
          <SnapshotRow label="Pending invites" value={s.pendingInvitations} attention={s.pendingInvitations > 0} />
          <p className="text-xs text-muted-foreground mt-2 text-center cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/app/school/team")}>
            View details →
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleSnapshots;
