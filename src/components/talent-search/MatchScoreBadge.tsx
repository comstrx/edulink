import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { MatchResult } from "@/lib/matching";
import { getTopReasons } from "@/lib/matching";

interface MatchScoreBadgeProps {
  result: MatchResult;
  compact?: boolean;
}

const scoreColor = (score: number) => {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  return "bg-muted text-muted-foreground border-border";
};

const confIcon = (c: MatchResult["confidence"]) => {
  if (c === "high") return null;
  if (c === "medium") return <AlertCircle className="h-2.5 w-2.5" />;
  return <AlertCircle className="h-2.5 w-2.5 text-destructive" />;
};

const MatchScoreBadge = ({ result, compact = false }: MatchScoreBadgeProps) => {
  const reasons = getTopReasons(result, 5);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-[20px] px-1.5 border font-semibold gap-0.5 cursor-default",
              scoreColor(result.score)
            )}
          >
            {confIcon(result.confidence)}
            Match: {result.score}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs p-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">
              Match Score: {result.score}%
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({result.confidence} confidence)
              </span>
            </p>
            <div className="space-y-1">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  {r.matched ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                  )}
                  <span>
                    <span className="font-medium">{r.label}:</span>{" "}
                    <span className="text-muted-foreground">{r.reason}</span>
                  </span>
                </div>
              ))}
            </div>
            {result.missingData.length > 0 && (
              <p className="text-[10px] text-muted-foreground pt-1 border-t">
                Missing: {result.missingData.join(", ")}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MatchScoreBadge;
