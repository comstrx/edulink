/**
 * GrowthActionsCard — Journey-grouped growth actions
 *
 * Teacher-facing card showing recommended growth actions,
 * organized by journey state: Next Steps → In Progress → Completed.
 * Top action is rendered as a visually dominant hero item.
 * Reads from unified recommendations (snapshot + growth).
 * CTA buttons use central action handler — no local routing.
 * Presentation semantics imported from centralized constants.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRecommendationShownTelemetry, useRecommendationClickTelemetry } from "@/intelligence/adapters/hooks/useRecommendationTelemetry";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, ArrowRight, Loader2, CheckCircle2, Info, Sparkles, Bell, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getCompletionExplanation } from "@/lib/recommendations/completion-explainer";
import { RecommendationExplainTooltipContent } from "@/components/intelligence/RecommendationExplainTooltip";
import { executeRecommendationAction } from "@/actions/recommendation-action.handler";
import { resolveActionMapEntry } from "@/actions/recommendation-action.map";
import { useRecommendationStatusToast } from "@/intelligence/adapters/hooks/useRecommendationStatusToast";
import {
  PRIORITY_STYLES, STATUS_LABELS, STATUS_STYLES,
  formatRecommendationTitle, getStatusCTALabel, isActionable, COMPLETED_ITEM_CLASS, getImpactLine,
  JOURNEY_CARD_STYLES, JOURNEY_SECTION_LABELS, getPathwayLabel,
  getExplanationLine, getConfidenceDisplay, getLossAversionLine, getProgressIndicator,
} from "@/intelligence/adapters/recommendation-presentation.constants";
import { getFramedTitle, getFramedExplanation } from "@/intelligence/adapters/helpers/surface-framing";
import { groupByJourneyState } from "@/intelligence/adapters/helpers/getRecommendationState";
import {
  deriveDashboardNudge, recordDashboardVisit, recordActionTaken,
  getDailyHookLine, getContinuityLine, getRandomMicroReward, NUDGE_STYLES,
} from "@/intelligence/adapters/helpers/dashboard-nudges";
import { toast } from "sonner";
import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

interface GrowthActionsCardProps {
  recommendations: UIRecommendation[];
  isLoading: boolean;
  maxItems?: number;
}

export default function GrowthActionsCard({
  recommendations,
  isLoading,
  maxItems = 5,
}: GrowthActionsCardProps) {
  const navigate = useNavigate();
  const [actionTakenId, setActionTakenId] = useState<string | null>(null);
  const trackClick = useRecommendationClickTelemetry();
  useRecommendationShownTelemetry(recommendations);

  // Record dashboard visit for nudge timing
  useEffect(() => {
    recordDashboardVisit();
  }, []);

  useRecommendationStatusToast(recommendations);

  // Derive nudge from existing recommendation data
  const nudge = useMemo(
    () => deriveDashboardNudge(recommendations),
    [recommendations],
  );

  // Items are pre-filtered by distribution layer — count directly
  const activeCount = recommendations.length;
  const dailyHook = getDailyHookLine(activeCount);
  const continuityLine = getContinuityLine(recommendations);

  const handleAction = useCallback((rec: UIRecommendation) => {
    trackClick(rec);
    recordActionTaken();
    setActionTakenId(rec.id);
    toast.success(getRandomMicroReward(), {
      description: "You're one step closer to your goals",
      duration: 3000,
    });
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
  }, [navigate]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading growth actions…</span>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Growth Actions</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            No targeted growth actions at this time. Apply to jobs and complete training to generate career insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Distribution layer already excluded primary and completed — use directly
  const items = recommendations.slice(0, maxItems);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Growth Actions</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Your top action is shown above. Complete it to unlock more growth actions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const heroRec = items[0];
  const remainingItems = items.slice(1);
  const journeyGroups = groupByJourneyState(remainingItems);

  const heroMapEntry = resolveActionMapEntry(heroRec.actionType);
  const heroIsUnsupported = heroMapEntry.actionType === "unsupported_action";
  const heroExplanation = getExplanationLine(heroRec);
  const heroImpact = getImpactLine(heroRec);
  const heroConfidence = getConfidenceDisplay(heroRec);
  const heroLoss = getLossAversionLine(heroRec);
  const heroProgress = getProgressIndicator(heroRec);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Growth Actions</h3>
              {dailyHook && (
                <p className="text-[11px] text-primary font-medium flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {dailyHook}
                </p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {recommendations.length} action{recommendations.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* ═══════════ NUDGE BANNER ═══════════ */}
        {nudge && (
          <div className={cn(
            "flex items-center gap-2.5 rounded-lg border px-3 py-2.5",
            NUDGE_STYLES[nudge.urgency].bg,
            NUDGE_STYLES[nudge.urgency].border,
          )}>
            <Bell className={cn("h-4 w-4 shrink-0", NUDGE_STYLES[nudge.urgency].icon)} />
            <div className="min-w-0">
              <p className={cn("text-xs font-semibold leading-tight", NUDGE_STYLES[nudge.urgency].text)}>
                {nudge.message}
              </p>
              <p className="text-[10px] text-muted-foreground leading-snug">{nudge.subtext}</p>
            </div>
          </div>
        )}

        {/* ═══════════ HERO — Top Priority Action ═══════════ */}
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent p-4 space-y-3">
          {/* Secondary priority signal */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-primary/70">
              <Sparkles className="h-3 w-3" /> Up next
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {getFramedTitle(heroRec, "dashboard")}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0 border",
                    PRIORITY_STYLES[heroRec.priority] ?? PRIORITY_STYLES.medium,
                  )}
                >
                  {heroRec.priority} priority
                </Badge>
              </div>
              {heroRec.source === "growth" && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                  From hiring feedback
                </Badge>
              )}
            </div>
          </div>

          {/* LOSS AVERSION — what user is missing */}
          {heroLoss && (
            <p className="text-xs text-destructive/80 font-medium leading-snug">
              ⚠ {heroLoss}
            </p>
          )}

          {/* WHY — Explanation */}
          {heroExplanation && (
            <div className="rounded-lg bg-background/60 border border-border/50 px-3 py-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Why this action</p>
              <p className="text-xs text-foreground/90 leading-relaxed">{getFramedExplanation(heroRec, "dashboard") ?? heroExplanation}</p>
            </div>
          )}

          {/* PROGRESS — how close they are */}
          {heroProgress.level !== "low" && (
            <p className={cn("text-[11px] font-medium", heroProgress.style)}>
              {heroProgress.label}
            </p>
          )}

          {/* WHAT — Impact */}
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3 text-chart-2 shrink-0" />
            <p className="text-xs text-chart-2 font-medium">{heroImpact}</p>
          </div>

          {/* Confidence + CTA */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-[10px] italic", heroConfidence.style)}>
              {heroConfidence.label}
            </span>

            {!heroIsUnsupported && isActionable(heroRec.status) && (
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs gap-1.5 px-4 shadow-sm"
                onClick={() => handleAction(heroRec)}
              >
                {getStatusCTALabel(heroRec.status, heroMapEntry.ctaLabel)}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* ═══════════ CONTINUITY LINE ═══════════ */}
        {continuityLine && (
          <p className="text-[11px] text-center text-primary/80 font-medium py-1">
            {continuityLine}
          </p>
        )}

        {/* ═══════════ REMAINING — Standard Items ═══════════ */}
        {journeyGroups.map((group) => (
          <div key={group.state} className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {JOURNEY_SECTION_LABELS[group.state] ?? group.label}
            </p>
            {group.items.map((rec) => {
              const mapEntry = resolveActionMapEntry(rec.actionType);
              const isUnsupported = mapEntry.actionType === "unsupported_action";
              const isComplete = group.state === "completed";
              const explanation = getExplanationLine(rec);
              const confidence = getConfidenceDisplay(rec);

              return (
                <div
                  key={rec.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    JOURNEY_CARD_STYLES[group.state] ?? "border-border/50",
                    isComplete && COMPLETED_ITEM_CLASS,
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Target className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{getFramedTitle(rec, "dashboard")}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0 border",
                          PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.medium,
                        )}
                      >
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", STATUS_STYLES[rec.status])}>
                        {STATUS_LABELS[rec.status]}
                      </Badge>
                      {rec.source === "growth" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                          From hiring feedback
                        </Badge>
                      )}
                      {getPathwayLabel(rec) && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-chart-2/30 text-chart-2">
                          {getPathwayLabel(rec)}
                        </Badge>
                      )}
                    </div>

                    {/* Loss aversion for secondary items */}
                    {!isComplete && getLossAversionLine(rec) && (
                      <p className="text-[10px] text-destructive/70 font-medium leading-snug">
                        ⚠ {getLossAversionLine(rec)}
                      </p>
                    )}

                    {/* Inline explanation for secondary items */}
                    {explanation && !isComplete && (
                      <p className="text-[11px] text-foreground/70 leading-snug">{getFramedExplanation(rec, "dashboard") ?? explanation}</p>
                    )}

                    <p className="text-[10px] text-muted-foreground/80 italic leading-snug">
                      {getImpactLine(rec)}
                    </p>
                    {getCompletionExplanation(rec) && (
                      <p className="text-[9px] text-chart-2/80 leading-snug">{getCompletionExplanation(rec)}</p>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Confidence indicator inline */}
                      <span className={cn("text-[10px] italic", confidence.style)}>
                        {confidence.label}
                      </span>

                      {rec.reasonCodes && rec.reasonCodes.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-help bg-transparent border-0 p-0">
                                <Info className="h-3 w-3" />
                                Details
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              <RecommendationExplainTooltipContent rec={{
                                source: rec.source,
                                actionType: rec.actionType,
                                status: rec.status,
                                reasonCodes: rec.reasonCodes,
                                confidence: rec.confidence,
                                groupKey: rec.groupKey,
                                pathwayContext: rec.pathwayContext,
                              }} />
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {recommendations.length > maxItems && (
          <p className="text-[11px] text-muted-foreground text-center">
            +{recommendations.length - maxItems} more actions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
