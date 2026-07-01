/**
 * CandidateComparisonTable — Side-by-side comparison of candidates
 *
 * Consumes pre-computed comparison data. Presentation only.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CandidateComparisonSummary, CandidateComparisonEntry } from "@/intelligence/decision/types/decision-intelligence.types";

const DIMENSION_LABELS: Record<string, string> = {
  criScore: "CRI Score",
  matchScore: "Match Score",
  verifiedSignalCount: "Verified Signals",
  credentialStrength: "Credentials",
  pathwayCompletionCount: "Pathway Completions",
  unresolvedGapCount: "Unresolved Gaps",
  growthMomentum: "Growth Momentum",
  readinessLevel: "Readiness Level",
  rankingScore: "Ranking Score",
};

type ComparisonDimensionKey = keyof Omit<CandidateComparisonEntry, "teacherId" | "teacherName" | "rankingExplanation">;

function formatValue(key: string, value: string | number | null | undefined): string {
  if (value == null) return "—";
  if (typeof value === "number") return String(Math.round(value * 100) / 100);
  return String(value).replace(/_/g, " ");
}

function getDimensionValue(entry: CandidateComparisonEntry, key: ComparisonDimensionKey): string | number | null {
  const val = entry[key];
  if (val == null) return null;
  return val as string | number;
}

function isBestInDimension(key: ComparisonDimensionKey, entry: CandidateComparisonEntry, all: CandidateComparisonEntry[]): boolean {
  const val = getDimensionValue(entry, key);
  if (val == null) return false;
  if (key === "unresolvedGapCount") {
    return all.every((c) => {
      const cv = getDimensionValue(c, key);
      return cv == null || (cv as number) >= (val as number);
    });
  }
  if (typeof val === "number") {
    return all.every((c) => {
      const cv = getDimensionValue(c, key);
      return cv == null || (cv as number) <= val;
    });
  }
  return false;
}

interface Props {
  comparison: CandidateComparisonSummary;
}

export default function CandidateComparisonTable({ comparison }: Props) {
  if (comparison.candidates.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Dimension</th>
            {comparison.candidates.map((c) => (
              <th key={c.teacherId} className="text-center py-1.5 px-2 text-foreground font-semibold">
                {c.teacherName || c.teacherId.slice(0, 8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.dimensions.map((dim) => (
            <tr key={dim} className="border-b border-border/40">
              <td className="py-1.5 px-2 text-muted-foreground font-medium">
                {DIMENSION_LABELS[dim] ?? dim}
              </td>
              {comparison.candidates.map((c) => {
                const best = isBestInDimension(dim, c, comparison.candidates);
                return (
                  <td key={c.teacherId} className="text-center py-1.5 px-2">
                    <span className={cn(best && "font-semibold text-primary")}>
                      {formatValue(dim, getDimensionValue(c, dim))}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
