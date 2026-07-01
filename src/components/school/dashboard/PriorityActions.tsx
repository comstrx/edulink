import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ChevronRight, Briefcase, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SchoolDashboardStats } from "@/hooks/useSchoolDashboardStats";
import { buildPriorityItems, priorityStyles } from "@/lib/school/decision-system/buildPriorityItems";

interface Props {
  stats: SchoolDashboardStats;
  canUseHiring: boolean;
  canUseTraining: boolean;
}

const PriorityActions = ({ stats, canUseHiring, canUseTraining }: Props) => {
  const navigate = useNavigate();
  const items = buildPriorityItems(stats, canUseHiring, canUseTraining);

  if (items.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/15 shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-primary" />
          </div>
          <p className="text-base font-semibold">Everything is running smoothly</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Your hiring activity is active and your team is progressing well. No urgent actions right now.
          </p>
          <div className="flex gap-2 mt-5">
            {canUseHiring && (
              <Button variant="outline" size="sm" className="transition-all duration-150" onClick={() => navigate("/app/school/hiring/overview")}>
                <Briefcase className="mr-1.5 h-3 w-3" /> View Hiring
              </Button>
            )}
            <Button variant="outline" size="sm" className="transition-all duration-150" onClick={() => navigate("/app/school/team")}>
              <Users className="mr-1.5 h-3 w-3" /> View Team
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/15 shadow-md ring-1 ring-primary/5">
      <CardHeader className="pb-3 px-7 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
          What needs your attention
        </p>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Priority Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-7 pb-6">
        {items.map((item, i) => {
          const style = priorityStyles[item.priority];
          const Icon = item.icon;
          const isTop = i === 0;
          return (
            <div
              key={i}
              className={`flex items-start justify-between rounded-md p-3 border transition-all duration-150 hover:shadow-sm ${style.border} ${isTop ? `border-l-4 border-l-primary ring-1 ring-offset-1 ring-offset-background ${item.priority === "high" ? "ring-destructive/40" : "ring-warning/40"}` : ""}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="rounded-md bg-primary/10 p-1.5 shrink-0 mt-0.5">
                  <Icon className={`${isTop ? "h-4 w-4" : "h-3.5 w-3.5"} text-primary`} />
                </div>
                <div className="min-w-0">
                  {isTop && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mb-1">
                      Top Priority
                    </Badge>
                  )}
                  <p className={`${isTop ? "text-sm font-semibold" : "text-sm font-medium"}`}>{item.problem}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.explanation}</p>
                  <p className="text-sm text-primary/80 mt-1 italic">Impact: {item.impact}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 ml-2 transition-all duration-150"
                onClick={() => navigate(item.path)}
              >
                {item.cta} <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PriorityActions;
