/**
 * TeamWeakAreasCard — Sprint 10
 *
 * Shows team-level weak areas with severity indicators.
 * Provides institutional visibility into where the team needs most support.
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, ArrowRight, CheckCircle } from "lucide-react";
import { useSchoolAggregatedInsights } from "@/intelligence/school/hooks/useSchoolAggregatedInsights";
import type { TeamWeakArea } from "@/intelligence/school/types/school-aggregated-insights.types";

interface Props {
  schoolId: string;
}

const severityBadge: Record<string, { variant: "destructive" | "secondary" | "outline"; label: string }> = {
  critical: { variant: "destructive", label: "Critical" },
  moderate: { variant: "secondary", label: "Moderate" },
  low: { variant: "outline", label: "Low" },
};

function WeakAreaBar({ area }: { area: TeamWeakArea }) {
  const badge = severityBadge[area.severity] ?? severityBadge.low;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate" title={area.label}>
        {area.label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            area.severity === "critical"
              ? "bg-destructive/70"
              : area.severity === "moderate"
                ? "bg-warning/70"
                : "bg-primary/50"
          }`}
          style={{ width: `${Math.min(area.affectedPercent, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-10 text-right">
        {area.affectedPercent}%
      </span>
      <Badge variant={badge.variant} className="text-[9px] px-1 py-0 shrink-0">
        {badge.label}
      </Badge>
    </div>
  );
}

const TeamWeakAreasCard = ({ schoolId }: Props) => {
  const { resolvedState, data } = useSchoolAggregatedInsights(schoolId);

  if (resolvedState === "loading") {
    return <div className="h-20 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />;
  }

  const navigate = useNavigate();

  if (resolvedState === "unavailable" || !data || data.weakAreas.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No major weak areas detected</p>
              <p className="text-xs text-muted-foreground">Your team performance is balanced across key areas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Team Weak Areas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Most critical development areas (prioritized)
        </p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {data.weakAreas.map((area) => (
          <WeakAreaBar key={area.areaKey} area={area} />
        ))}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => navigate("/app/school/team")}>
            View Team <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => navigate("/app/school/training/overview")}>
            Assign Training <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamWeakAreasCard;
