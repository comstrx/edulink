/**
 * WorkforceDashboardCard — Sprint 8D
 *
 * Minimal workforce intelligence summary for school admins.
 * Shows capability overview, department health, promotion pipeline, and gaps.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, Award, TrendingUp, AlertTriangle, ShieldCheck,
  Building, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkforceInsightSummary } from "@/workforce/types/workforce.types";

interface Props {
  data: WorkforceInsightSummary | null | undefined;
  isLoading: boolean;
}

const severityColor: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-destructive/80 text-destructive-foreground",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  low: "bg-muted text-muted-foreground",
};

export default function WorkforceDashboardCard({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          <Building className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p>No workforce data available yet.</p>
          <p className="text-xs mt-1">Add team members to see workforce intelligence.</p>
        </CardContent>
      </Card>
    );
  }

  const { profile, departments, promotionPipeline, gaps } = data;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Workforce Intelligence</h2>
              <p className="text-[11px] text-muted-foreground">
                Team capability overview
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox icon={Users} label="Team Size" value={profile.teacherCount} />
            <StatBox icon={ShieldCheck} label="Verified" value={profile.verifiedTeacherCount} />
            <StatBox icon={Award} label="Credential %" value={`${profile.credentialCoverage}%`} />
            <StatBox icon={TrendingUp} label="Promotion Ready" value={profile.promotionReadyCount} />
          </div>

          {/* Career Stage Distribution */}
          {Object.keys(profile.careerStageDistribution).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Career Stage Distribution
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(profile.careerStageDistribution).map(([stage, count]) => (
                  <Badge key={stage} variant="outline" className="text-[10px]">
                    {stage}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Capabilities */}
      {departments.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Department Capability</h3>
            <div className="space-y-2">
              {departments.slice(0, 6).map((dept) => (
                <div
                  key={dept.departmentKey}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {dept.departmentLabel}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {dept.teacherCount} teachers
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Progress
                        value={100 - dept.gapScore}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
                        {100 - Math.round(dept.gapScore)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promotion Pipeline */}
      {promotionPipeline.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Promotion Pipeline</h3>
            </div>
            <div className="space-y-2">
              {promotionPipeline.slice(0, 5).map((entry) => (
                <div
                  key={entry.teacherId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.teacherName ?? entry.teacherId.slice(0, 8)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {entry.currentStage ?? "—"} → {entry.nextStage ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={entry.readinessPercent} className="h-1.5 w-16" />
                    <span className="text-xs font-medium text-foreground w-8 text-right">
                      {entry.readinessPercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workforce Gaps */}
      {gaps.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Workforce Gaps</h3>
            </div>
            <div className="space-y-2">
              {gaps.map((gap, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-[10px]", severityColor[gap.severity])}>
                      {gap.severity}
                    </Badge>
                    <p className="text-sm text-foreground">{gap.description}</p>
                  </div>
                  {gap.recommendedIntervention && (
                    <p className="text-[11px] text-muted-foreground pl-1">
                      💡 {gap.recommendedIntervention}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold text-foreground">{String(value)}</p>
    </div>
  );
}
