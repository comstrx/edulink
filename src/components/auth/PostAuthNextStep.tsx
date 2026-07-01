/**
 * PostAuthNextStep — Shows the recommended next step on the dashboard.
 *
 * Uses the same decision system to maintain narrative continuity:
 * "We sent you here because X — your next step is Y."
 *
 * ⚠️ Read-only. No new calculations.
 */

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePostAuthDecision } from "@/hooks/usePostAuthDecision";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG = {
  high: {
    icon: AlertTriangle,
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    iconColor: "text-destructive",
  },
  medium: {
    icon: Sparkles,
    border: "border-amber-300/50",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  low: {
    icon: CheckCircle2,
    border: "border-emerald-300/50",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
};

export default function PostAuthNextStep() {
  const decision = usePostAuthDecision();

  if (!decision.isReady || !decision.destination) return null;

  // Don't show if the user is already on their recommended destination
  // (they've already landed where they should be)
  if (decision.reasonKey === "teacher_moderate_readiness" || decision.reasonKey === "school_ready") {
    // These mean "you're on the right page" — show a welcome message instead
  }

  const config = PRIORITY_CONFIG[decision.priority];
  const Icon = config.icon;

  // Determine CTA label based on reason
  let ctaLabel = "Get Started";
  if (decision.reasonKey.includes("readiness")) ctaLabel = "View Training";
  if (decision.reasonKey.includes("profile") || decision.reasonKey.includes("no_")) ctaLabel = "Complete Setup";
  if (decision.reasonKey === "teacher_high_readiness") ctaLabel = "Browse Jobs";

  return (
    <Card className={cn("border", config.border, config.bg)}>
      <CardContent className="flex items-center gap-4 py-4 px-5">
        <div className={cn("shrink-0", config.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Recommended Next Step</p>
          <p className="text-sm text-muted-foreground truncate">{decision.reason}</p>
        </div>
        {decision.destination && (
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
            <Link to={decision.destination}>
              {ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
