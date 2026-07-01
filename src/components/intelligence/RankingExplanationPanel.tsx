/**
 * RankingExplanationPanel — Explains why a candidate ranks at their position
 *
 * Breaks down ranking score contributions. Presentation only.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import type { RankingExplanation } from "@/intelligence/talent/ranking/candidate-ranking";
import { cn } from "@/lib/utils";

interface Props {
  explanation: RankingExplanation;
}

const CONTRIBUTION_ITEMS: { key: keyof RankingExplanation; label: string; isNegative?: boolean }[] = [
  { key: "criContribution", label: "Career Readiness (CRI)" },
  { key: "matchContribution", label: "Job Match" },
  { key: "verifiedSignalsContribution", label: "Verified Signals" },
  { key: "credentialContribution", label: "Credentials" },
  { key: "pathwayContribution", label: "Pathway Completion" },
  { key: "growthBonus", label: "Growth Momentum Bonus" },
  { key: "gapPenalty", label: "Gap Penalty", isNegative: true },
];

export default function RankingExplanationPanel({ explanation }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Ranking Breakdown
        </h4>
        <span className="text-sm font-bold text-foreground">
          {explanation.totalScore.toFixed(1)}
        </span>
      </div>
      <div className="space-y-1">
        {CONTRIBUTION_ITEMS.map(({ key, label, isNegative }) => {
          const value = explanation[key];
          if (value === 0) return null;
          return (
            <div key={key} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{label}</span>
              <span className={cn(
                "font-medium tabular-nums",
                isNegative ? "text-destructive" : "text-foreground",
              )}>
                {isNegative ? `−${value}` : `+${value}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
