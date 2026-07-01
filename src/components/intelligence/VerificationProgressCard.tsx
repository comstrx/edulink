/**
 * VerificationProgressCard — Expanded verification status for dashboard
 *
 * Displays credential verification progress from stable snapshot.
 * Does NOT compute verification. Pure presentation.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, ShieldAlert, Shield, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerifiedStateConsumptionResult } from "@/intelligence/consumption";
import IntelligenceLoadingSkeleton from "./IntelligenceLoadingSkeleton";
import IntelligenceEmptyState from "./IntelligenceEmptyState";
import IntelligenceErrorState from "./IntelligenceErrorState";
import IntelligenceStaleBanner from "./IntelligenceStaleBanner";
import IntelligenceStatusBanner from "./IntelligenceStatusBanner";
import VerificationExplanationPanel from "./VerificationExplanationPanel";

interface VerificationProgressCardProps {
  result: VerifiedStateConsumptionResult;
}

const STATUS_CONFIG = {
  full: {
    icon: ShieldCheck,
    label: "Fully Verified",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    progressClass: "[&>div]:bg-emerald-500",
  },
  partial: {
    icon: ShieldAlert,
    label: "Partially Verified",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    progressClass: "[&>div]:bg-amber-500",
  },
  none: {
    icon: Shield,
    label: "Not Verified",
    className: "border-border text-muted-foreground",
    progressClass: "[&>div]:bg-muted-foreground",
  },
} as const;

const VerificationProgressCard = ({ result }: VerificationProgressCardProps) => {
  const [showExplanation, setShowExplanation] = useState(false);
  if (result.status === "loading") {
    return <IntelligenceLoadingSkeleton rows={3} />;
  }

  if (result.status === "error") {
    return <IntelligenceErrorState message="Unable to load verification status" />;
  }

  if (result.status === "empty" || !result.data) {
    return (
      <IntelligenceEmptyState
        icon={Shield}
        title="Verification Status"
        message="Add credentials to track your verification progress"
      />
    );
  }

  const { overallStatus, credentials, verifiedCount, totalCount } = result.data;
  const config = STATUS_CONFIG[overallStatus];
  const Icon = config.icon;
  const pct = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Verification Status</h2>
              <p className="text-[11px] text-muted-foreground">
                {verifiedCount} of {totalCount} credential{totalCount !== 1 ? "s" : ""} verified
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] h-[20px] px-1.5 gap-0.5 font-medium border", config.className)}
          >
            <Icon className="h-2.5 w-2.5" />
            {config.label}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className={cn("text-xl font-bold tabular-nums", pct === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
            {pct}%
          </span>
          <Progress value={pct} className={cn("h-2 flex-1", config.progressClass)} />
        </div>

        {/* Credential list */}
        {credentials.length > 0 && (
          <div className="space-y-1.5">
            {credentials.slice(0, 5).map((cred) => (
              <div
                key={cred.termId}
                className="flex items-center gap-2 text-xs p-1.5 rounded-md border border-border/50 bg-muted/30"
              >
                {cred.verified ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                )}
                <span className={cn("flex-1 truncate", cred.verified ? "text-foreground" : "text-muted-foreground")}>
                  {cred.credentialType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                {cred.verified && cred.verifiedAt && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(cred.verifiedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
            {credentials.length > 5 && (
              <p className="text-[11px] text-muted-foreground text-center">
                +{credentials.length - 5} more
              </p>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[11px] text-muted-foreground gap-1"
          onClick={() => setShowExplanation((v) => !v)}
        >
          {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showExplanation ? "Hide details" : "What does this mean?"}
        </Button>

        {showExplanation && result.data && <VerificationExplanationPanel data={result.data} />}

        <IntelligenceStatusBanner
          metadata={result.metadata}
          labels={{
            stale: "Verification status may be outdated",
            invalidated: "Verification status needs refresh",
            recomputing: "Refreshing verification status…",
          }}
        />
      </CardContent>
    </Card>
  );
};

export default VerificationProgressCard;
