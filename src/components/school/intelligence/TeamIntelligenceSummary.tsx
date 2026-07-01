/**
 * TeamIntelligenceSummary — Compact read-only summary
 * of school team intelligence from useSchoolTeamIntelligence.
 * Pure UI wiring — no logic, no computation.
 */

import { useSchoolTeamIntelligence } from "@/intelligence/school/hooks/useSchoolTeamIntelligence";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, GraduationCap, TrendingUp } from "lucide-react";

interface TeamIntelligenceSummaryProps {
  schoolId: string;
}

const TeamIntelligenceSummary = ({ schoolId }: TeamIntelligenceSummaryProps) => {
  const { resolvedState, data } = useSchoolTeamIntelligence(schoolId);

  if (resolvedState === "loading") {
    return (
      <div className="h-20 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />
    );
  }

  if (resolvedState === "unavailable" || !data) return null;

  const { promotionReadiness, trainingReadiness, verifiedStaff, teamSize } = data;

  const readyPercent = teamSize > 0
    ? Math.round(((promotionReadiness.readyCount + promotionReadiness.nearReadyCount) / teamSize) * 100)
    : 0;

  const trainingCoverage = teamSize > 0
    ? Math.round(((trainingReadiness.activeTrainingCount + trainingReadiness.completedTrainingCount) / teamSize) * 100)
    : 0;

  return (
    <Card className="border-border/50 bg-muted/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Team Intelligence
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* Overall Readiness */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Team Readiness</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{promotionReadiness.averageReadinessPercent}%</p>
            <Progress value={promotionReadiness.averageReadinessPercent} className="h-1.5" />
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{promotionReadiness.readyCount} ready</span>
              <span>{promotionReadiness.nearReadyCount} near</span>
              <span>{promotionReadiness.needsDevelopmentCount} developing</span>
            </div>
          </div>

          {/* Training Coverage */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Training Coverage</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{trainingCoverage}%</p>
            <Progress value={trainingCoverage} className="h-1.5" />
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{trainingReadiness.activeTrainingCount} active</span>
              <span>{trainingReadiness.completedTrainingCount} completed</span>
              <span>{trainingReadiness.noTrainingCount} none</span>
            </div>
          </div>

          {/* Verified Staff */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Verified Staff</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{verifiedStaff.verifiedSharePercent}%</p>
            <Progress value={verifiedStaff.verifiedSharePercent} className="h-1.5" />
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{verifiedStaff.fullyVerified} full</span>
              <span>{verifiedStaff.partiallyVerified} partial</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamIntelligenceSummary;
