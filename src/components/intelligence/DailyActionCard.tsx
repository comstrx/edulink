import { useCallback, useState } from "react";
import { useRecommendationShownTelemetry, useRecommendationClickTelemetry } from "@/intelligence/adapters/hooks/useRecommendationTelemetry";
import { useNavigate } from "react-router-dom";
import { Zap, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { executeRecommendationAction } from "@/actions/recommendation-action.handler";
import { resolveActionMapEntry } from "@/actions/recommendation-action.map";
import { getStatusCTALabel, getImpactLine, getConfidenceDisplay } from "@/intelligence/adapters/recommendation-presentation.constants";
import { getFramedTitle, getFramedExplanation, getFramedSubtitle } from "@/intelligence/adapters/helpers/surface-framing";
import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

interface DailyActionCardProps {
  /** Pre-resolved primary action from distribution layer. No local .find needed. */
  primaryAction?: UIRecommendation;
  /** Full list for telemetry tracking only */
  allItems?: UIRecommendation[];
  isLoading: boolean;
  /** Sprint 9: segment-specific impact prefix */
  impactPrefix?: string;
}

const DailyActionCard = ({ primaryAction, allItems = [], isLoading, impactPrefix = "" }: DailyActionCardProps) => {
  const navigate = useNavigate();
  const [acted, setActed] = useState(false);
  const trackClick = useRecommendationClickTelemetry();
  useRecommendationShownTelemetry(allItems);

  const topAction = primaryAction;

  const handleClick = useCallback(() => {
    if (!topAction) return;
    trackClick(topAction);
    setActed(true);
    toast.success("Good job, you're making progress ✔", {
      description: topAction.title,
      duration: 3000,
    });
    executeRecommendationAction(
      {
        recommendationId: topAction.id,
        type: topAction.actionType,
        targetResourceId: topAction.targetId ?? "",
        actionLabelKey: topAction.title,
        priority: topAction.priority,
        traceId: topAction.traceId,
        pathwayContext: topAction.pathwayContext,
      },
      navigate,
    );
  }, [topAction, navigate]);

  if (isLoading) return null;

  // Acted state — brief confirmation
  if (acted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="font-medium">Nice work — you're making progress today</span>
      </div>
    );
  }

  // Empty state — no actionable recommendations
  if (!topAction) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        <span>You're on track — keep exploring opportunities</span>
      </div>
    );
  }

  const mapEntry = resolveActionMapEntry(topAction.actionType);
  const ctaLabel = getStatusCTALabel(topAction.status, mapEntry.ctaLabel);
  const framedTitle = getFramedTitle(topAction, "dashboard");
  const framedExplanation = getFramedExplanation(topAction, "dashboard");
  const impactLine = impactPrefix ? `${impactPrefix}${getImpactLine(topAction)}` : getImpactLine(topAction);
  const confidence = getConfidenceDisplay(topAction);

  // For untargeted course recommendations, use subtitle fallback
  const isUntargetedCourse = topAction.actionType.includes("course") && !topAction.targetId;
  const subtitle = isUntargetedCourse && impactLine ? impactLine : null;

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.07] via-primary/[0.03] to-transparent p-5 space-y-3 shadow-sm">
      {/* Priority signal */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Zap className="h-3.5 w-3.5" /> Your #1 step today
        </span>
        <span className={cn("text-[10px] font-medium", confidence.style)}>{confidence.label}</span>
      </div>

      {/* Main content */}
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-base font-bold text-foreground leading-tight">{framedTitle}</p>
          {framedExplanation && (
            <div className="rounded-lg bg-background/60 border border-border/50 px-3 py-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Why this action</p>
              <p className="text-xs text-foreground/85 leading-relaxed">{framedExplanation}</p>
            </div>
          )}
          {subtitle && !framedExplanation && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {impactLine && !isUntargetedCourse && (
            <div className="flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3 text-chart-2 shrink-0" />
              <p className="text-xs text-chart-2 font-medium italic">{impactLine}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleClick} className="gap-1.5 px-4 shadow-sm">
          {ctaLabel} <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default DailyActionCard;
