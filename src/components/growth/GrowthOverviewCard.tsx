/**
 * GrowthOverviewCard — Dashboard-level card
 * Combines growth signal flags with canonical readiness badge and explanation.
 *
 * Progressive states:
 * - UNAVAILABLE: no growth data → purposeful entry
 * - ACTIVE: resolved data → full display
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import CareerReadinessBadge from "./CareerReadinessBadge";
import ExplanationPanel from "@/components/explainability/ExplanationPanel";
import type { GrowthSummary } from "@/growth/types/growth-summary.types";
import type { ExplanationContract } from "@/explainability/types/explanation-contract.types";
import type { CanonicalReadinessLevel } from "@/intelligence/readiness/canonical-readiness.types";

interface GrowthOverviewCardProps {
  growth: GrowthSummary;
  readinessLevel: CanonicalReadinessLevel | null;
  explanation?: ExplanationContract;
}

function Signal({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      )}
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export default function GrowthOverviewCard({ growth, readinessLevel, explanation }: GrowthOverviewCardProps) {
  if (growth.resolvedState === "loading") {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading growth overview…</span>
        </CardContent>
      </Card>
    );
  }

  if (growth.resolvedState !== "resolved") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Career Growth
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">
              Your growth signals will appear as you build your profile
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Add skills, complete training, and earn credentials to track your career growth momentum.
            </p>
            <Link
              to="/app/teacher/training"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Explore training
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { growthSignals: s } = growth;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Career Growth
          </CardTitle>
          <CareerReadinessBadge level={readinessLevel} size="md" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Signal label="Credentials Ready" active={s.credentialsReady} />
          <Signal label="Training Active" active={s.trainingActive} />
          <Signal label="Growth Momentum" active={s.growthMomentumActive} />
        </div>
        {explanation && explanation.status === "ready" && (
          <ExplanationPanel explanation={explanation} />
        )}
      </CardContent>
    </Card>
  );
}
