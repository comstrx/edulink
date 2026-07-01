/**
 * CandidateReadinessPanel — Readiness dimension breakdown for an applicant
 *
 * Displays each readiness dimension as a visual bar with level indicator.
 * Reads from decision intelligence engine output. Presentation only.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import { cn } from "@/lib/utils";
import type { CandidateReadinessBreakdown, ReadinessDimension } from "@/intelligence/decision/types/decision-intelligence.types";

const LEVEL_STYLES: Record<string, string> = {
  strong: "bg-emerald-500 dark:bg-emerald-400",
  moderate: "bg-sky-500 dark:bg-sky-400",
  weak: "bg-amber-500 dark:bg-amber-400",
  missing: "bg-muted-foreground/30",
};

const LEVEL_LABELS: Record<string, string> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
  missing: "Missing",
};

function DimensionBar({ dimension }: { dimension: ReadinessDimension }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-foreground font-medium">{dimension.label}</span>
        <span className="text-muted-foreground">{LEVEL_LABELS[dimension.level]}</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", LEVEL_STYLES[dimension.level])}
          style={{ width: `${Math.max(dimension.score, 3)}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{dimension.evidence}</p>
    </div>
  );
}

interface Props {
  breakdown: CandidateReadinessBreakdown;
}

export default function CandidateReadinessPanel({ breakdown }: Props) {
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
        Readiness Breakdown
      </h4>
      <div className="space-y-2">
        {breakdown.dimensions.map((d) => (
          <DimensionBar key={d.key} dimension={d} />
        ))}
      </div>
    </div>
  );
}
