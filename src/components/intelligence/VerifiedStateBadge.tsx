/**
 * VerifiedStateBadge — Trust status indicator for teacher profiles
 *
 * Displays verification status from stable snapshot. Does NOT compute verification.
 * Returns a subtle loading skeleton when fetching, null on error, and explicit badge otherwise.
 */

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerifiedStateConsumptionResult } from "@/intelligence/consumption";

interface VerifiedStateBadgeProps {
  result: VerifiedStateConsumptionResult;
  showTooltip?: boolean;
}

const STATUS_CONFIG = {
  full: {
    icon: ShieldCheck,
    label: "Fully Verified",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  partial: {
    icon: ShieldAlert,
    label: "Partially Verified",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  none: {
    icon: Shield,
    label: "Not Verified",
    className: "border-border text-muted-foreground",
  },
} as const;

const VerifiedStateBadge = ({ result, showTooltip = true }: VerifiedStateBadgeProps) => {
  // Loading: show a small skeleton that matches badge dimensions to prevent layout shift
  if (result.status === "loading") {
    return <Skeleton className="h-[20px] w-24 rounded-full" />;
  }

  // Error or empty: return nothing — badge is supplementary, not critical
  if (result.status === "error" || result.status === "empty" || !result.data) {
    return null;
  }

  const { overallStatus, verifiedCount, totalCount } = result.data;
  const config = STATUS_CONFIG[overallStatus];
  const Icon = config.icon;

  const staleMarker = result.metadata.isStale ? " *" : "";

  const badge = (
    <Badge variant="outline" className={cn("text-[10px] h-[20px] px-1.5 gap-0.5 font-medium border", config.className)}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}{staleMarker}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1">
          <p>{verifiedCount} of {totalCount} credentials verified</p>
          {result.metadata.isStale && (
            <p className="text-muted-foreground italic">* Verification status may be outdated</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedStateBadge;
