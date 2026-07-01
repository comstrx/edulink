/**
 * IntelligenceStaleBanner — Inline indicator for snapshot freshness.
 *
 * Handles three freshness sub-states:
 * - stale: time-based, data still usable
 * - invalidated: source changed, data needs refresh
 * - recomputing: refresh is in progress
 *
 * Never fabricates values. Always shows real status.
 */

import { Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligenceStaleBannerProps {
  label?: string;
  /** If true, uses stronger visual treatment for invalidated data */
  isInvalidated?: boolean;
  /** If true, shows a recompute-in-progress indicator */
  isRecomputing?: boolean;
}

const IntelligenceStaleBanner = ({
  label,
  isInvalidated = false,
  isRecomputing = false,
}: IntelligenceStaleBannerProps) => {
  // Priority: recomputing > invalidated > stale
  if (isRecomputing) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-primary italic mt-2 pt-2 border-t border-border/40">
        <RefreshCw className="h-2.5 w-2.5 shrink-0 animate-spin" />
        <span>{label ?? "Refreshing data…"}</span>
      </div>
    );
  }

  if (isInvalidated) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 italic mt-2 pt-2 border-t border-amber-200/40 dark:border-amber-800/40">
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
        <span>{label ?? "This data needs to be refreshed"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic mt-2 pt-2 border-t border-border/40">
      <Clock className="h-2.5 w-2.5 shrink-0" />
      <span>{label ?? "This data may be outdated"}</span>
    </div>
  );
};

export default IntelligenceStaleBanner;
