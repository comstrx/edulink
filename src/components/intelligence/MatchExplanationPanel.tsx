/**
 * MatchExplanationPanel — Strengths, gaps, and eligibility flags for Match
 *
 * Presentation-only — consumes data already in MatchConsumptionData.
 */

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";

interface MatchExplanationPanelProps {
  data: MatchConsumptionData;
}

const MatchExplanationPanel = ({ data }: MatchExplanationPanelProps) => {
  const { score, confidence, dimensions, matchedTermIds, unmatchedTermIds } = data;

  const strengths = dimensions.filter((d) => d.matched);
  const gaps = dimensions.filter((d) => !d.matched);

  return (
    <div className="space-y-4 pt-2 border-t border-border/40">
      <div className="flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Match Breakdown</h3>
      </div>

      {/* Eligibility flags */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] h-[18px] px-1.5 gap-0.5 font-medium border",
            score >= 60
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
          )}
        >
          {score >= 60 ? "Eligible" : "Partial Match"}
        </Badge>
        <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 gap-0.5 font-medium border-border text-muted-foreground">
          {confidence} confidence
        </Badge>
        {matchedTermIds.length > 0 && (
          <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 gap-0.5 font-medium border-border text-muted-foreground">
            {matchedTermIds.length} matched
          </Badge>
        )}
        {unmatchedTermIds.length > 0 && (
          <Badge variant="outline" className="text-[10px] h-[18px] px-1.5 gap-0.5 font-medium border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400">
            {unmatchedTermIds.length} unmatched
          </Badge>
        )}
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Strengths</p>
          {strengths.map((d, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <span className="font-medium text-foreground">{d.label}:</span>{" "}
                <span className="text-muted-foreground">{d.reason}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Gaps */}
      {gaps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gaps</p>
          {gaps.map((d, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
              <span>
                <span className="font-medium text-foreground">{d.label}:</span>{" "}
                <span className="text-muted-foreground">{d.reason}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Dimension scores */}
      {dimensions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Dimension Scores</p>
          <div className="grid grid-cols-2 gap-1">
            {dimensions.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded border border-border/40 bg-muted/20">
                <span className="text-muted-foreground truncate">{d.label}</span>
                <span className={cn("font-semibold tabular-nums ml-1", d.matched ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {d.score}/{d.maxScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchExplanationPanel;
