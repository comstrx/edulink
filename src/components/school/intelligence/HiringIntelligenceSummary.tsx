/**
 * HiringIntelligenceSummary — Compact read-only summary
 * of school hiring intelligence from useSchoolHiringIntelligence.
 * Pure UI wiring — no logic, no computation.
 */

import { useSchoolHiringIntelligence } from "@/intelligence/school/hooks/useSchoolHiringIntelligence";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, ShieldCheck, Target } from "lucide-react";

interface HiringIntelligenceSummaryProps {
  schoolId: string;
}

const HiringIntelligenceSummary = ({ schoolId }: HiringIntelligenceSummaryProps) => {
  const { resolvedState, data } = useSchoolHiringIntelligence(schoolId);

  if (resolvedState === "loading") {
    return (
      <div className="h-20 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />
    );
  }

  if (resolvedState === "unavailable" || !data) return null;

  const { matchHealth, readinessDistribution, verifiedCandidates } = data;
  const totalScored = matchHealth.strong + matchHealth.moderate + matchHealth.weak;
  const strongPercent = totalScored > 0 ? Math.round((matchHealth.strong / totalScored) * 100) : 0;
  const totalReadiness = readinessDistribution.highlyReady + readinessDistribution.ready +
    readinessDistribution.developing + readinessDistribution.early;
  const readyPercent = totalReadiness > 0
    ? Math.round(((readinessDistribution.highlyReady + readinessDistribution.ready) / totalReadiness) * 100)
    : 0;

  return (
    <Card className="border-border/50 bg-muted/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hiring Intelligence
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* Match Health */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Match Quality</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{strongPercent}% Strong</p>
            <Progress value={strongPercent} className="h-1.5" />
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{matchHealth.strong} strong</span>
              <span>{matchHealth.moderate} moderate</span>
              <span>{matchHealth.weak} weak</span>
            </div>
          </div>

          {/* Readiness */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Candidate Readiness</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{readyPercent}% Ready</p>
            <Progress value={readyPercent} className="h-1.5" />
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{readinessDistribution.highlyReady + readinessDistribution.ready} ready</span>
              <span>{readinessDistribution.developing} developing</span>
              <span>{readinessDistribution.early} early</span>
            </div>
          </div>

          {/* Verified */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Verified Candidates</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{verifiedCandidates.verifiedSharePercent}%</p>
            <Progress value={verifiedCandidates.verifiedSharePercent} className="h-1.5" />
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>{verifiedCandidates.fullyVerified} full</span>
              <span>{verifiedCandidates.partiallyVerified} partial</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HiringIntelligenceSummary;
