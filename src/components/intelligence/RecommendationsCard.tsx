/**
 * RecommendationsCard — Teacher-facing recommendation widget
 *
 * Displays top recommendations from unified source (snapshot + growth),
 * grouped by journey state: Next Steps → In Progress → Completed.
 * Uses shared intelligence state components for loading/empty/error/stale.
 * Navigation delegated to central action handler — no local link mapping.
 * Presentation semantics imported from centralized constants.
 */

import { useState } from "react";
import { useRecommendationShownTelemetry, useRecommendationClickTelemetry } from "@/intelligence/adapters/hooks/useRecommendationTelemetry";
import { getCompletionExplanation } from "@/lib/recommendations/completion-explainer";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { executeRecommendationAction } from "@/actions/recommendation-action.handler";
import { resolveActionMapEntry } from "@/actions/recommendation-action.map";
import IntelligenceLoadingSkeleton from "./IntelligenceLoadingSkeleton";
import IntelligenceEmptyState from "./IntelligenceEmptyState";
import IntelligenceErrorState from "./IntelligenceErrorState";
import RecommendationExplanationPanel from "./RecommendationExplanationPanel";
import { useRecommendationStatusToast } from "@/intelligence/adapters/hooks/useRecommendationStatusToast";
import {
  TYPE_ICON, DEFAULT_ICON, PRIORITY_STYLES, STATUS_LABELS, STATUS_STYLES,
  formatRecommendationTitle, getStatusCTALabel, isActionable, COMPLETED_ITEM_CLASS, getImpactLine,
  JOURNEY_CARD_STYLES, JOURNEY_SECTION_LABELS, getPathwayLabel, getExplanationLine, getConfidenceDisplay,
} from "@/intelligence/adapters/recommendation-presentation.constants";
import { groupByJourneyState } from "@/intelligence/adapters/helpers/getRecommendationState";
import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

interface RecommendationsCardProps {
  recommendations: UIRecommendation[];
  isLoading: boolean;
  error: string | null;
  maxItems?: number;
}

const RecommendationsCard = ({ recommendations, isLoading, error, maxItems = 4 }: RecommendationsCardProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const trackClick = useRecommendationClickTelemetry();
  useRecommendationShownTelemetry(recommendations);

  useRecommendationStatusToast(recommendations);

  if (isLoading) {
    return <IntelligenceLoadingSkeleton rows={3} />;
  }

  if (error) {
    return <IntelligenceErrorState message="Unable to load recommendations" />;
  }

  if (recommendations.length === 0) {
    return (
      <IntelligenceEmptyState
        icon={Zap}
        title="Recommended Actions"
        message="Complete your profile to get personalized recommendations"
      />
    );
  }

  const totalCount = recommendations.length;
  const journeyGroups = groupByJourneyState(recommendations.slice(0, maxItems));

  const handleAction = (rec: UIRecommendation) => {
    trackClick(rec);
    executeRecommendationAction(
      {
        recommendationId: rec.id,
        type: rec.actionType,
        targetResourceId: rec.targetId ?? "",
        actionLabelKey: rec.title,
        priority: rec.priority,
        traceId: rec.traceId,
        pathwayContext: rec.pathwayContext,
      },
      navigate,
    );
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recommended Actions</h2>
            <p className="text-[11px] text-muted-foreground">{totalCount} action{totalCount !== 1 ? "s" : ""} to boost your career readiness</p>
          </div>
        </div>

        {journeyGroups.map((group) => (
          <div key={group.state} className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {JOURNEY_SECTION_LABELS[group.state] ?? group.label}
            </p>
            {group.items.map((rec) => {
              const Icon = TYPE_ICON[rec.actionType] ?? DEFAULT_ICON;
              const mapEntry = resolveActionMapEntry(rec.actionType);
              const isExpanded = expandedId === rec.id;
              const isUnsupported = mapEntry.actionType === "unsupported_action";
              const isComplete = group.state === "completed";
              return (
                <div key={rec.id} className="space-y-0">
                  <div className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                    JOURNEY_CARD_STYLES[group.state] ?? "border-border/50",
                    isComplete && COMPLETED_ITEM_CLASS,
                  )}>
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Icon className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {formatRecommendationTitle(rec.title)}
                      </p>
                      {getExplanationLine(rec) && (
                        <p className="text-[10px] text-foreground/70 leading-snug truncate">
                          {getExplanationLine(rec)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn("text-[9px] h-[16px] px-1 font-medium border", PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.medium)}>
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[9px] h-[16px] px-1 font-medium border", STATUS_STYLES[rec.status])}>
                          {STATUS_LABELS[rec.status]}
                        </Badge>
                        {rec.source === "growth" && (
                          <Badge variant="outline" className="text-[9px] h-[16px] px-1 font-medium border-primary/30 text-primary">
                            From hiring feedback
                          </Badge>
                        )}
                        {getPathwayLabel(rec) && (
                          <Badge variant="outline" className="text-[9px] h-[16px] px-1 font-medium border-chart-2/30 text-chart-2">
                            {getPathwayLabel(rec)}
                          </Badge>
                        )}
                        <span className={cn("text-[9px] italic", getConfidenceDisplay(rec).style)}>
                          {getConfidenceDisplay(rec).label}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 italic leading-snug">
                        {getImpactLine(rec)}
                      </p>
                      {getCompletionExplanation(rec) && (
                        <p className="text-[9px] text-chart-2/80 leading-snug">{getCompletionExplanation(rec)}</p>
                      )}
                      <div className="flex items-center gap-2 pt-0.5">
                        {!isUnsupported && isActionable(rec.status) && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1 px-3"
                            onClick={() => handleAction(rec)}
                          >
                            {getStatusCTALabel(rec.status, mapEntry.ctaLabel)}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                        <button
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                          onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          Why?
                        </button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <RecommendationExplanationPanel recommendation={{
                      recommendationId: rec.id,
                      type: rec.actionType,
                      priority: rec.priority,
                      confidence: rec.confidence ?? "medium",
                      reasonCodes: rec.reasonCodes,
                      relatedGapIds: [],
                      groupKey: rec.groupKey ?? (rec.source === "growth" ? "training_actions" : "immediate_actions"),
                      actionLabelKey: rec.title,
                      source: rec.source,
                      status: rec.status,
                      pathwayContext: rec.pathwayContext,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {totalCount > maxItems && (
          <p className="text-[11px] text-muted-foreground text-center">
            +{totalCount - maxItems} more recommendation{totalCount - maxItems !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationsCard;
