/**
 * GapIndicatorBadge — Compact gap count badge for school-facing surfaces
 *
 * Shows gap count from stable snapshot. Presentation-only.
 */

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GapConsumptionResult } from "@/intelligence/consumption";

interface GapIndicatorBadgeProps {
  result: GapConsumptionResult;
}

const gapColor = (count: number) => {
  if (count === 0) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (count <= 2) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800";
};

const GapIndicatorBadge = ({ result }: GapIndicatorBadgeProps) => {
  if (result.status === "loading") {
    return <Skeleton className="h-[20px] w-14 rounded-full" />;
  }

  if (result.status === "empty" || result.status === "error" || !result.data) return null;

  const { totalGaps, groupedSummary } = result.data;

  if (totalGaps === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-[20px] px-1.5 border font-semibold gap-0.5 cursor-default",
              gapColor(totalGaps),
            )}
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            {totalGaps} Gap{totalGaps !== 1 ? "s" : ""}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1 max-w-xs">
          <p className="font-semibold">{totalGaps} professional gap{totalGaps !== 1 ? "s" : ""}</p>
          {groupedSummary.map((g) => (
            <p key={g.category} className="text-muted-foreground">
              {g.category}: {g.count} ({g.highestSeverity})
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GapIndicatorBadge;
