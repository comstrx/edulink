/**
 * SchoolIntelligenceAlerts — Sprint 10
 *
 * Displays intelligence-driven alerts from aggregated team insights.
 * Replaces guesswork with data-driven action prompts.
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { useSchoolAggregatedInsights } from "@/intelligence/school/hooks/useSchoolAggregatedInsights";
import type { SchoolIntelligenceAlert } from "@/intelligence/school/types/school-aggregated-insights.types";

interface Props {
  schoolId: string;
}

const severityConfig: Record<string, { icon: typeof AlertTriangle; containerClass: string; badgeVariant: "destructive" | "secondary" | "outline" }> = {
  critical: {
    icon: AlertTriangle,
    containerClass: "border-destructive/30 bg-destructive/5",
    badgeVariant: "destructive",
  },
  warning: {
    icon: Bell,
    containerClass: "border-warning/30 bg-warning/5",
    badgeVariant: "secondary",
  },
  info: {
    icon: Info,
    containerClass: "border-border bg-muted/20",
    badgeVariant: "outline",
  },
};

function AlertItem({ alert }: { alert: SchoolIntelligenceAlert }) {
  const navigate = useNavigate();
  const config = severityConfig[alert.severity] ?? severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${config.containerClass}`}>
      <div className="shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium">{alert.title}</p>
          <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
            {alert.source}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{alert.description}</p>
      </div>
      {alert.actionPath && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 ml-1 text-xs"
          onClick={() => navigate(alert.actionPath!)}
        >
          {alert.actionLabel ?? "View"} <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

const SchoolIntelligenceAlerts = ({ schoolId }: Props) => {
  const { resolvedState, data } = useSchoolAggregatedInsights(schoolId);

  if (resolvedState === "loading") {
    return <div className="h-20 rounded-lg border border-border/50 bg-muted/20 animate-pulse" />;
  }

  if (resolvedState === "unavailable" || !data || data.alerts.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No alerts — your team is on track</p>
              <p className="text-xs text-muted-foreground">We'll notify you when something needs attention</p>
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
          <Bell className="h-4 w-4 text-primary" />
          Intelligence Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </CardContent>
    </Card>
  );
};

export default SchoolIntelligenceAlerts;
