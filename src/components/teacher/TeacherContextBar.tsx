/**
 * TeacherContextBar — Lightweight state propagation component
 *
 * Shows readiness, top gap, gap count, and recent completion feedback.
 * Does NOT show "next recommendation" — DailyActionCard owns that role.
 * Uses ONLY canonical hooks. No new logic. No computation.
 */

import { Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCanonicalReadiness } from "@/intelligence/readiness/useCanonicalReadiness";
import { useTeacherGapSnapshot } from "@/intelligence/consumption/hooks/useTeacherGapSnapshot";
import { useSurfaceRecommendations, distributeContextBar } from "@/intelligence/recommendations/distribution";
import { CANONICAL_READINESS_LABELS, CANONICAL_READINESS_STYLES } from "@/intelligence/readiness/canonical-readiness.types";
import { getCompletionFeedbackLine } from "@/intelligence/adapters/recommendation-presentation.constants";
import { cn } from "@/lib/utils";

interface TeacherContextBarProps {
  teacherId: string | undefined;
  /** Contextual micro-copy shown below the bar */
  contextMessage?: string;
}

export default function TeacherContextBar({ teacherId, contextMessage }: TeacherContextBarProps) {
  const { readinessLevel, isLoading: readinessLoading } = useCanonicalReadiness(teacherId);
  const gapResult = useTeacherGapSnapshot(teacherId);
  const { items: recommendations, isLoading: recsLoading } = useSurfaceRecommendations(teacherId, "contextbar");

  const isLoading = readinessLoading || gapResult.status === "loading" || recsLoading;

  // Top gap by severity
  const topGap = gapResult.data?.gaps?.length
    ? gapResult.data.gaps.reduce((best, g) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[g.severity] ?? 4) < (order[best.severity] ?? 4) ? g : best;
      })
    : null;

  // Distribution layer handles contextbar-specific filtering
  const contextDist = distributeContextBar(recommendations);
  const recentCompletion = contextDist.recentCompletion;

  // Nothing to show
  if (!isLoading && !readinessLevel && !topGap && !recentCompletion) return null;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {/* Readiness */}
        {readinessLevel && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Readiness:</span>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border-0 font-medium text-xs px-1.5 py-0",
                CANONICAL_READINESS_STYLES[readinessLevel]
              )}
            >
              <Zap className="h-2.5 w-2.5" />
              {CANONICAL_READINESS_LABELS[readinessLevel]}
            </Badge>
          </div>
        )}

        {/* Top Gap */}
        {topGap && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Focus:</span>
            <span className="flex items-center gap-1 text-xs font-medium text-foreground">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              {topGap.label}
            </span>
          </div>
        )}

        {/* Gap count summary */}
        {gapResult.data?.gaps && gapResult.data.gaps.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Gaps:</span>
            <span className="text-xs font-medium text-foreground">
              {gapResult.data.gaps.length} area{gapResult.data.gaps.length !== 1 ? "s" : ""} to improve
            </span>
          </div>
        )}
      </div>

      {/* Completion Feedback — shows when a recent action was completed */}
      {recentCompletion && (
        <div className="flex items-center gap-1.5 text-[11px]">
          <CheckCircle2 className="h-3 w-3 text-chart-2 shrink-0" />
          <span className="text-chart-2 font-medium">
            {getCompletionFeedbackLine(recentCompletion)}
          </span>
        </div>
      )}

      {/* Context message */}
      {contextMessage && (
        <p className="text-[11px] text-muted-foreground">{contextMessage}</p>
      )}
    </div>
  );
}
