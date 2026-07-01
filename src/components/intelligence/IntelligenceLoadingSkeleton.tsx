/**
 * IntelligenceLoadingSkeleton — Reusable loading skeleton for intelligence cards.
 * Prevents layout shift by matching approximate card dimensions.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface IntelligenceLoadingSkeletonProps {
  /** Visual variant: "card" renders full card shell, "inline" renders skeleton rows only */
  variant?: "card" | "inline";
  /** Number of skeleton rows below the header */
  rows?: number;
}

const IntelligenceLoadingSkeleton = ({ variant = "card", rows = 2 }: IntelligenceLoadingSkeletonProps) => {
  const content = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );

  if (variant === "inline") return content;

  return (
    <Card>
      <CardContent className="p-5">{content}</CardContent>
    </Card>
  );
};

export default IntelligenceLoadingSkeleton;
