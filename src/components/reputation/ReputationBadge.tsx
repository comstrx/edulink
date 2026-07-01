/**
 * ReputationBadge — Reputation Graph Layer
 *
 * Compact reputation indicator for directory cards, search results,
 * and candidate panels. Shows reputation level + optional score.
 *
 * Accepts either a full ReputationGraphSummary or a minimal shape
 * with just resolvedState, reputationScore, and reputationLevel.
 */

import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReputationGraphLevel } from "@/reputation/types/reputation-graph.types";
import {
  REPUTATION_GRAPH_LEVEL_LABELS,
  REPUTATION_GRAPH_LEVEL_COLORS,
} from "@/reputation/types/reputation-graph.types";

interface ReputationBadgeInput {
  resolvedState: string;
  reputationScore: number;
  reputationLevel: ReputationGraphLevel;
}

interface ReputationBadgeProps {
  reputation: ReputationBadgeInput;
  showScore?: boolean;
  size?: "sm" | "md";
}

export default function ReputationBadge({
  reputation,
  showScore = false,
  size = "sm",
}: ReputationBadgeProps) {
  if (reputation.resolvedState !== "resolved") return null;
  if (reputation.reputationScore === 0) return null;

  const label = REPUTATION_GRAPH_LEVEL_LABELS[reputation.reputationLevel];
  const color = REPUTATION_GRAPH_LEVEL_COLORS[reputation.reputationLevel];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-0 font-medium",
        color,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
      )}
    >
      <Shield className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {label}
      {showScore && (
        <span className="opacity-70">({reputation.reputationScore})</span>
      )}
    </Badge>
  );
}
