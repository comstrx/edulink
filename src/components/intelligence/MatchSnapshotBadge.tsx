/**
 * MatchSnapshotBadge — School-facing match score from intelligence snapshot
 *
 * Displays match score from stable snapshot in teacher×job context.
 * Does NOT compute match scores. Shows loading skeleton during fetch,
 * nothing when empty/error (badge is supplementary).
 */

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchConsumptionResult } from "@/intelligence/consumption";
import IntelligenceStaleBanner from "./IntelligenceStaleBanner";

interface MatchSnapshotBadgeProps {
  result: MatchConsumptionResult;
}

const scoreColor = (score: number) => {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  return "bg-muted text-muted-foreground border-border";
};

const confIcon = (c: string) => {
  if (c === "high") return null;
  if (c === "medium") return <AlertCircle className="h-2.5 w-2.5" />;
  return <AlertCircle className="h-2.5 w-2.5 text-destructive" />;
};

const MatchSnapshotBadge = ({ result }: MatchSnapshotBadgeProps) => {
  // Loading: inline skeleton matching badge size
  if (result.status === "loading") {
    return <Skeleton className="h-[20px] w-20 rounded-full" />;
  }

  // Empty or error: badge is supplementary — render nothing
  if (result.status === "empty" || result.status === "error") return null;
  if (!result.data) return null;

  const { score, confidence, dimensions } = result.data;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-[20px] px-1.5 border font-semibold gap-0.5 cursor-default",
              scoreColor(score),
            )}
          >
            {confIcon(confidence)}
            Match: {score}%
            {result.status === "stale" && <span className="opacity-60">*</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs p-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">
              Match Score: {score}%
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({confidence} confidence)
              </span>
            </p>
            {dimensions.length > 0 && (
              <div className="space-y-1">
                {dimensions.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px]">
                    {d.matched ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                    )}
                    <span>
                      <span className="font-medium">{d.label}:</span>{" "}
                      <span className="text-muted-foreground">{d.reason}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {result.status === "stale" && (
              <IntelligenceStaleBanner label="Score may be outdated" />
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MatchSnapshotBadge;
