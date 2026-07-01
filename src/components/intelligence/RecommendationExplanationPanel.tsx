/**
 * RecommendationExplanationPanel — Sprint 4: Explainability Productization
 *
 * Uses centralized ExplainabilityPresenter for all display logic.
 * No local string formatting or reason-code mapping.
 */

import { Badge } from "@/components/ui/badge";
import { Info, Target, Zap, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildExplainabilityView,
  type ExplainabilityInput,
} from "@/intelligence/explainability/recommendation-explainability.presenter";

interface RecommendationItem {
  recommendationId: string;
  type: string;
  priority: string;
  confidence: string;
  reasonCodes: string[];
  relatedGapIds: string[];
  groupKey: string;
  actionLabelKey: string;
  source?: string;
  status?: string;
  completion_reason_key?: string | null;
  pathwayContext?: { isPathway?: boolean };
}

interface RecommendationExplanationPanelProps {
  recommendation: RecommendationItem;
}

const PRIORITY_IMPACT: Record<string, { label: string; className: string }> = {
  critical: { label: "High Impact", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800" },
  high: { label: "Significant Impact", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
  medium: { label: "Moderate Impact", className: "border-border text-muted-foreground" },
  low: { label: "Minor Impact", className: "border-border/50 text-muted-foreground/70" },
};

const RecommendationExplanationPanel = ({ recommendation }: RecommendationExplanationPanelProps) => {
  const { priority, relatedGapIds } = recommendation;
  const impact = PRIORITY_IMPACT[priority] ?? PRIORITY_IMPACT.medium;

  const view = buildExplainabilityView({
    source: recommendation.source ?? "snapshot",
    actionType: recommendation.type,
    status: recommendation.status ?? "new",
    reasonCodes: recommendation.reasonCodes,
    confidence: recommendation.confidence,
    groupKey: recommendation.groupKey,
    pathwayContext: recommendation.pathwayContext,
    completion_reason_key: recommendation.completion_reason_key,
  });

  return (
    <div className="space-y-3 p-3 rounded-md border border-border/40 bg-muted/20">
      {/* Origin */}
      <div className="flex items-center gap-1.5">
        <Info className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-semibold text-foreground">{view.originExplanation}</span>
      </div>

      {/* Impact + confidence badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className={cn("text-[9px] h-[16px] px-1 gap-0.5 font-medium border", impact.className)}>
          <Target className="h-2.5 w-2.5" />
          {impact.label}
        </Badge>
        {view.confidenceLabel && (
          <Badge variant="outline" className="text-[9px] h-[16px] px-1 font-medium border-border text-muted-foreground">
            {view.confidenceLabel}
          </Badge>
        )}
        {view.sourceBadge && (
          <Badge variant="outline" className="text-[9px] h-[16px] px-1 font-medium border-primary/30 text-primary">
            {view.sourceBadge}
          </Badge>
        )}
      </div>

      {/* Impact explanation */}
      <div className="flex items-start gap-1.5 text-[11px]">
        <Target className="h-3 w-3 text-chart-2 shrink-0 mt-0.5" />
        <span className="text-muted-foreground">{view.impactExplanation}</span>
      </div>

      {/* Gap source */}
      {relatedGapIds.length > 0 && (
        <div className="flex items-start gap-1.5 text-[11px]">
          <Link2 className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <span className="text-muted-foreground">
            Addresses {relatedGapIds.length} identified gap{relatedGapIds.length !== 1 ? "s" : ""} in your profile
          </span>
        </div>
      )}

      {/* Humanized reasons */}
      {view.reasons.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Reasons</p>
          <div className="flex flex-wrap gap-1">
            {view.reasons.map((reason, i) => (
              <Badge key={i} variant="outline" className="text-[9px] h-[16px] px-1 font-medium border-border/60 text-muted-foreground">
                <Zap className="h-2 w-2 mr-0.5" />
                {reason}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Completion explanation */}
      {view.completionExplanation && (
        <p className="text-[10px] text-chart-2 font-medium">{view.completionExplanation}</p>
      )}

      {/* Category */}
      {view.categoryLabel && (
        <p className="text-[10px] text-muted-foreground">
          Category: <span className="font-medium">{view.categoryLabel}</span>
        </p>
      )}
    </div>
  );
};

export default RecommendationExplanationPanel;
