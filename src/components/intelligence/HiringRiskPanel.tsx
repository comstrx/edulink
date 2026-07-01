/**
 * HiringRiskPanel — Risk indicators for an applicant
 *
 * Displays hiring risk signals with severity badges.
 * Presentation only — data from decision intelligence engine.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateRiskIndicators } from "@/intelligence/decision/types/decision-intelligence.types";

const SEVERITY_CONFIG = {
  high: {
    icon: AlertTriangle,
    className: "border-destructive/30 bg-destructive/5 text-destructive",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
  },
  medium: {
    icon: AlertCircle,
    className: "border-amber-200 bg-amber-50/50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  low: {
    icon: Info,
    className: "border-border/60 bg-muted/30 text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

interface Props {
  risks: CandidateRiskIndicators;
}

export default function HiringRiskPanel({ risks }: Props) {
  if (risks.risks.length === 0) {
    return (
      <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        No hiring risks identified
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
        Hiring Risks
      </h4>
      <div className="space-y-1.5">
        {risks.risks.map((risk, i) => {
          const config = SEVERITY_CONFIG[risk.severity];
          const Icon = config.icon;
          return (
            <div key={i} className={cn("rounded-md border px-2.5 py-1.5", config.className)}>
              <div className="flex items-start gap-1.5">
                <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium">{risk.label}</span>
                    <Badge variant="outline" className={cn("text-[9px] h-[14px] px-1", config.badgeClass)}>
                      {risk.severity}
                    </Badge>
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5">{risk.explanation}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
