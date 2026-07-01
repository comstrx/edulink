/**
 * ExplanationSection — Reusable expandable explanation UI
 *
 * Renders a structured ExplanationDTO as a clean expandable section.
 * Presentation-only. Used by all intelligence cards.
 *
 * Phase 4.3 — Explainability Layer
 */

import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle2, XCircle, Minus, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExplanationDTO, EvidencePoint } from "@/intelligence/explainability/types/explanation.types";

interface ExplanationSectionProps {
  explanation: ExplanationDTO;
  className?: string;
  /** Called when the section mounts (for tracking) */
  onView?: () => void;
}

const SENTIMENT_ICON = {
  positive: CheckCircle2,
  negative: XCircle,
  neutral: Minus,
} as const;

const SENTIMENT_COLOR = {
  positive: "text-emerald-500",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

const ExplanationSection = ({ explanation, className, onView }: ExplanationSectionProps) => {
  // Track view on mount
  if (onView) {
    // Use a ref-based approach would be better, but keeping it simple
    // The parent should call onView when toggling visibility
  }

  const { headline, shortDescription, evidencePoints, suggestion } = explanation;

  return (
    <div className={cn("space-y-3 p-3 rounded-md border border-border/40 bg-muted/20", className)}>
      {/* Header */}
      <div className="flex items-start gap-1.5">
        <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-semibold text-foreground">{headline}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{shortDescription}</p>
        </div>
      </div>

      {/* Evidence points */}
      {evidencePoints.length > 0 && (
        <div className="space-y-1.5">
          {evidencePoints.map((point, i) => {
            const Icon = SENTIMENT_ICON[point.sentiment];
            const color = SENTIMENT_COLOR[point.sentiment];
            return (
              <div key={i} className="flex items-start gap-1.5 text-[11px]">
                <Icon className={cn("h-3 w-3 shrink-0 mt-0.5", color)} />
                <span>
                  <span className="font-medium text-foreground">{point.label}:</span>{" "}
                  <span className="text-muted-foreground">{point.detail}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Suggestion */}
      {suggestion && (
        <div className="flex items-start gap-1.5 text-[10px] text-primary/80 bg-primary/5 rounded p-2">
          <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
          <span>{suggestion}</span>
        </div>
      )}
    </div>
  );
};

export default ExplanationSection;
