import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, ChevronRight } from "lucide-react";
import type { SchoolDashboardStats } from "@/hooks/useSchoolDashboardStats";

type Priority = "high" | "medium" | "low";

interface Signal {
  problem: string;
  explanation: string;
  priority: Priority;
  cta: string;
  path: string;
}

function buildSignals(
  stats: SchoolDashboardStats,
  canUseHiring: boolean,
  canUseTraining: boolean,
): Signal[] {
  const signals: Signal[] = [];

  if (canUseHiring && stats.jobsWithNoApplicants > 0) {
    signals.push({
      problem: `${stats.jobsWithNoApplicants} job${stats.jobsWithNoApplicants > 1 ? "s" : ""} need${stats.jobsWithNoApplicants === 1 ? "s" : ""} attention — no applicants yet`,
      explanation: "These roles may need review or better visibility to attract candidates",
      priority: "high",
      cta: "Review Jobs",
      path: "/app/school/hiring/overview",
    });
  }

  if (canUseHiring && stats.pendingReviewApplicants > 0) {
    signals.push({
      problem: `${stats.pendingReviewApplicants} applicant${stats.pendingReviewApplicants > 1 ? "s are" : " is"} waiting for review`,
      explanation: "Review candidate progress and move the pipeline forward",
      priority: "medium",
      cta: "Review Applicants",
      path: "/app/school/hiring/applicants",
    });
  }

  if (canUseHiring && stats.pendingInterviews > 0) {
    signals.push({
      problem: `${stats.pendingInterviews} interview${stats.pendingInterviews > 1 ? "s" : ""} pending`,
      explanation: "Scheduled interviews need preparation or follow-up",
      priority: "medium",
      cta: "View Interviews",
      path: "/app/school/hiring/overview",
    });
  }

  if (canUseTraining && stats.overdueAssignments > 0) {
    signals.push({
      problem: `${stats.overdueAssignments} training assignment${stats.overdueAssignments > 1 ? "s are" : " is"} overdue`,
      explanation: "Staff members have missed their training deadlines",
      priority: "medium",
      cta: "Manage Training",
      path: "/app/school/training/overview",
    });
  }

  if (stats.pendingInvitations > 0) {
    signals.push({
      problem: `${stats.pendingInvitations} team invitation${stats.pendingInvitations > 1 ? "s" : ""} still pending`,
      explanation: "Invited members haven't accepted yet",
      priority: "low",
      cta: "View Team",
      path: "/app/school/team",
    });
  }

  // Sort by priority
  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  signals.sort((a, b) => order[a.priority] - order[b.priority]);

  return signals;
}

const priorityConfig: Record<Priority, { label: string; className: string; dotClass: string }> = {
  high: {
    label: "High Priority",
    className: "border-destructive/30 bg-destructive/5",
    dotClass: "bg-destructive",
  },
  medium: {
    label: "Medium Priority",
    className: "border-warning/30 bg-warning/5",
    dotClass: "bg-warning",
  },
  low: {
    label: "Low Priority",
    className: "border-muted-foreground/20 bg-muted/30",
    dotClass: "bg-muted-foreground",
  },
};

interface DashboardSignalsProps {
  stats: SchoolDashboardStats;
  canUseHiring: boolean;
  canUseTraining: boolean;
}

const DashboardSignals = ({ stats, canUseHiring, canUseTraining }: DashboardSignalsProps) => {
  const navigate = useNavigate();
  const signals = buildSignals(stats, canUseHiring, canUseTraining);

  if (signals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Needs Your Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {signals.map((signal, i) => {
          const config = priorityConfig[signal.priority];
          const isTop = i === 0;
          return (
            <div
              key={i}
              className={`flex items-start justify-between rounded-md p-3 border ${config.className} ${isTop ? `ring-1 ring-offset-1 ring-offset-background ${signal.priority === "high" ? "ring-destructive" : "ring-warning"}` : ""}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${config.dotClass}`} />
                <div className="min-w-0">
                  {isTop && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive mb-1 inline-block">
                      Top Priority
                    </span>
                  )}
                  <p className="text-sm font-medium">{signal.problem}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{signal.explanation}</p>
                  {!isTop && (
                    <span className="text-xs text-muted-foreground mt-1 inline-block">
                      {config.label}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 ml-2"
                onClick={() => navigate(signal.path)}
              >
                {signal.cta} <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DashboardSignals;
