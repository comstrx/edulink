/**
 * ExplanationPanel — Expandable explanation UI component
 *
 * Displays the normalized ExplanationContract as an expandable
 * reasons list with confidence badge and missing signals.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2, ShieldCheck, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExplanationContract, ExplanationReason, ConfidenceLevel } from "@/explainability/types/explanation-contract.types";

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; className: string }> = {
  low: { label: "Low Confidence", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium Confidence", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  high: { label: "High Confidence", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

const EVIDENCE_ICONS: Record<string, typeof CheckCircle2> = {
  verified: ShieldCheck,
  derived: Info,
  missing: AlertTriangle,
  private: Eye,
};

const EVIDENCE_STYLES: Record<string, string> = {
  verified: "text-emerald-600 dark:text-emerald-400",
  derived: "text-primary",
  missing: "text-amber-500 dark:text-amber-400",
  private: "text-muted-foreground",
};

interface ExplanationPanelProps {
  explanation: ExplanationContract;
  /** Compact = inline badge only; default = expandable panel */
  compact?: boolean;
  className?: string;
}

function ReasonRow({ reason }: { reason: ExplanationReason }) {
  const Icon = EVIDENCE_ICONS[reason.evidenceStatus] ?? Info;
  const style = EVIDENCE_STYLES[reason.evidenceStatus] ?? "text-muted-foreground";

  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", style)} />
      <div className="flex-1 min-w-0">
        <span className="text-foreground">{reason.label}</span>
        <span className="text-muted-foreground ml-1.5 text-[10px] capitalize">
          ({reason.sourceDomain})
        </span>
      </div>
    </div>
  );
}

export default function ExplanationPanel({
  explanation,
  compact = false,
  className,
}: ExplanationPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (explanation.status === "loading") {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        Loading explanation…
      </div>
    );
  }

  if (explanation.status === "unavailable" || explanation.reasons.length === 0) {
    return null;
  }

  const confidenceConfig = CONFIDENCE_CONFIG[explanation.confidenceLevel];

  if (compact) {
    return (
      <Badge
        variant="outline"
        className={cn("text-[10px] h-[20px] px-1.5 border-0 font-medium gap-0.5", confidenceConfig.className)}
      >
        <Info className="h-2.5 w-2.5" />
        {confidenceConfig.label}
      </Badge>
    );
  }

  return (
    <div className={cn("rounded-md border border-border/60 bg-card", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors rounded-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">
            {explanation.summary}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={cn("text-[10px] h-[18px] px-1.5 border-0 font-medium", confidenceConfig.className)}
          >
            {confidenceConfig.label}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/40">
          {/* Contributing signals */}
          {explanation.reasons.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Supporting Evidence
              </p>
              {explanation.reasons.map((reason, i) => (
                <ReasonRow key={`${reason.sourceDomain}-${reason.signalType}-${i}`} reason={reason} />
              ))}
            </div>
          )}

          {/* Missing signals */}
          {explanation.missingSignals.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Missing Signals
              </p>
              {explanation.missingSignals.map((signal, i) => (
                <div key={`missing-${i}`} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" />
                  <div className="flex-1 min-w-0">
                    <span className="text-muted-foreground">{signal.label}</span>
                    {signal.hint && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{signal.hint}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
