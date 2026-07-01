/**
 * RecommendationExplainTooltip — Sprint 4
 *
 * Shared compact explainability tooltip content.
 * Used by GrowthActionsCard, Skills, CRI — any surface needing
 * concise "Why?" in a tooltip rather than a full panel.
 *
 * Consumes the centralized ExplainabilityPresenter.
 */

import { buildExplainabilityView, type ExplainabilityInput } from "@/intelligence/explainability/recommendation-explainability.presenter";

interface ExplainTooltipProps {
  rec: ExplainabilityInput;
}

export function RecommendationExplainTooltipContent({ rec }: ExplainTooltipProps) {
  const view = buildExplainabilityView(rec);

  return (
    <div className="space-y-1.5">
      <p className="font-medium">{view.originExplanation}</p>
      {view.reasons.length > 0 && (
        <p className="text-muted-foreground">{view.reasons.slice(0, 2).join("; ")}</p>
      )}
      <p className="text-chart-2">{view.impactExplanation}</p>
      {view.completionExplanation && (
        <p className="text-primary">{view.completionExplanation}</p>
      )}
      {view.confidenceLabel && (
        <p className="text-muted-foreground">{view.confidenceLabel}</p>
      )}
    </div>
  );
}
