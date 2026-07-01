/**
 * CriScoreBadge — Compact CRI score badge for school-facing surfaces
 *
 * Shows CRI score from stable snapshot. Presentation-only.
 */

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CriConsumptionResult } from "@/intelligence/consumption";

interface CriScoreBadgeProps {
  result: CriConsumptionResult;
}

const scoreColor = (score: number) => {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  if (score >= 40) return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800";
  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
};

const CriScoreBadge = ({ result }: CriScoreBadgeProps) => {
  if (result.status === "loading") {
    return <Skeleton className="h-[20px] w-16 rounded-full" />;
  }

  if (result.status === "empty" || result.status === "error" || !result.data) return null;

  const { score, band } = result.data;

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
            <Target className="h-2.5 w-2.5" />
            CRI: {score}%
            {result.status === "stale" && <span className="opacity-60">*</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>Career Readiness: {score}% ({band})</p>
          {result.status === "stale" && (
            <p className="text-muted-foreground italic">* Score may be outdated</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CriScoreBadge;
