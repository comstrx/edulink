import { useNavigate } from "react-router-dom";
import { useSchoolTeamGapIntelligence } from "@/intelligence/school/hooks/useSchoolTeamGapIntelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";

interface TeamGapInsightsProps {
  schoolId: string;
}

const TeamGapInsights = ({ schoolId }: TeamGapInsightsProps) => {
  const navigate = useNavigate();
  const { resolvedState, data } = useSchoolTeamGapIntelligence(schoolId);

  if (resolvedState === "loading") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Team Gap Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading gap data…</p>
        </CardContent>
      </Card>
    );
  }

  if (resolvedState === "unavailable" || !data || data.teachersWithGaps === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No team gaps identified yet</p>
              <p className="text-xs text-muted-foreground">Gap analysis will appear as team data is collected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topItems = data.gapDistribution.slice(0, 5);

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Team Gap Insights
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Distribution of gaps across your team — {data.teachersWithGaps} of {data.totalTeachers} member{data.totalTeachers !== 1 ? "s" : ""} affected
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Gap Highlight */}
        {data.topGapCategory && (
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Most Common Gap
            </p>
            <p className="text-lg font-semibold mt-0.5">{data.topGapCategory}</p>
            <p className="text-xs text-muted-foreground">
              Affects {topItems[0]?.percentage ?? 0}% of team members with gaps
            </p>
          </div>
        )}

        {/* Distribution bars */}
        {topItems.length > 1 && (
          <div className="space-y-2">
            {topItems.map((item) => (
              <div key={item.category} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">
                  {item.category}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums w-8 text-right">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Critical signal */}
        {data.criticalGapCategory && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Critical gap: {data.criticalGapCategory}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Most frequent among teachers needing urgent development
              </p>
            </div>
          </div>
        )}

        {/* Take Action CTA */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 mt-1"
          onClick={() => navigate("/app/school/team")}
        >
          Take Action
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default TeamGapInsights;
