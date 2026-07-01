/**
 * CriExplanationPanel — "Why this score?" breakdown for CRI
 *
 * Shows component scores, reason codes, and improvement hints.
 * Presentation-only — consumes data already in CriConsumptionData.
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Info, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CriConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";

interface CriExplanationPanelProps {
  data: CriConsumptionData;
}

const COMPONENT_LABELS: Record<string, string> = {
  profile: "Profile Completeness",
  training: "Professional Development",
  trust: "Trust & Verification",
  hiring: "Hiring Signals",
};

const scoreColor = (pct: number) => {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  if (pct >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-destructive";
};

const progressColor = (pct: number) => {
  if (pct >= 80) return "[&>div]:bg-emerald-500";
  if (pct >= 60) return "[&>div]:bg-amber-500";
  if (pct >= 40) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-destructive";
};

const formatReasonCode = (code: string) =>
  code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CriExplanationPanel = ({ data }: CriExplanationPanelProps) => {
  const { score, band, dimensions, gapTermIds } = data;

  // Derive reason codes from dimensions
  const metDimensions = dimensions.filter((d) => d.met);
  const unmetDimensions = dimensions.filter((d) => !d.met);

  return (
    <div className="space-y-4 pt-2 border-t border-border/40">
      <div className="flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Why this score?</h3>
      </div>

      {/* Component score breakdown */}
      <div className="space-y-2.5">
        {dimensions.map((dim) => {
          const pct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
          return (
            <div key={dim.dimension} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {COMPONENT_LABELS[dim.dimension] ?? dim.label}
                </span>
                <span className={cn("text-[11px] font-semibold tabular-nums", scoreColor(pct))}>
                  {dim.score}/{dim.maxScore} ({pct}%)
                </span>
              </div>
              <Progress value={pct} className={cn("h-1.5", progressColor(pct))} />
            </div>
          );
        })}
      </div>

      {/* Strengths */}
      {metDimensions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Strengths</p>
          {metDimensions.map((dim) => (
            <div key={dim.dimension} className="flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="text-foreground">{dim.label}: fully met</span>
            </div>
          ))}
        </div>
      )}

      {/* Areas for improvement */}
      {unmetDimensions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Areas for Improvement</p>
          {unmetDimensions.map((dim) => (
            <div key={dim.dimension} className="flex items-center gap-1.5 text-[11px]">
              <XCircle className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="text-foreground">{dim.label}: {dim.score}/{dim.maxScore}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gap term count */}
      {gapTermIds.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[9px] h-[16px] px-1 border-border text-muted-foreground">
            {gapTermIds.length} linked gap{gapTermIds.length !== 1 ? "s" : ""} affecting score
          </Badge>
        </div>
      )}

      {/* Band explanation */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Your overall score of <span className="font-semibold">{score}%</span> places you in the{" "}
        <span className="font-semibold capitalize">{band}</span> band.{" "}
        {score < 60
          ? "Focus on completing your profile and earning certifications to improve."
          : score < 80
            ? "You're making good progress. Continue building credentials to reach the top tier."
            : "Excellent readiness! Maintain your credentials and stay active."}
      </p>
    </div>
  );
};

export default CriExplanationPanel;
