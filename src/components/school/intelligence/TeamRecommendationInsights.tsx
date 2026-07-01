/**
 * TeamRecommendationInsights — Sprint 10
 *
 * Displays aggregated recommendation insights at the team level.
 * Instead of per-teacher recommendations, shows institutional patterns
 * with suggested actions for school administrators.
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Users, ArrowRight } from "lucide-react";
import { useSchoolAggregatedInsights } from "@/intelligence/school/hooks/useSchoolAggregatedInsights";
import type { TeamRecommendationInsight } from "@/intelligence/school/types/school-aggregated-insights.types";

interface Props {
  schoolId: string;
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

function InsightRow({ insight }: { insight: TeamRecommendationInsight }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-b-0">
      <div className="shrink-0 mt-0.5">
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${priorityColors[insight.priority] ?? ""}`}
        >
          {insight.priority}
        </Badge>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{insight.label}</p>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {insight.teacherCount}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{insight.institutionalAction}</p>
      </div>
    </div>
  );
}

const TeamRecommendationInsights = ({ schoolId }: Props) => {
  const navigate = useNavigate();
  const { resolvedState, data } = useSchoolAggregatedInsights(schoolId);

  if (resolvedState === "loading") {
    return <div className="h-24 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />;
  }

  if (resolvedState === "unavailable" || !data || data.recommendationInsights.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No team-wide patterns detected</p>
              <p className="text-xs text-muted-foreground">Growth needs are currently individualized across staff</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topInsights = data.recommendationInsights.slice(0, 5);

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Team Development Patterns
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Common growth needs observed across your team
        </p>
      </CardHeader>
      <CardContent>
        <div className="divide-y-0">
          {topInsights.map((insight) => (
            <InsightRow key={insight.actionType} insight={insight} />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 mt-3"
          onClick={() => navigate("/app/school/training/overview")}
        >
          View Training Overview
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default TeamRecommendationInsights;
