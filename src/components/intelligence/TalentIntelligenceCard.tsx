/**
 * TalentIntelligenceCard — Unified intelligence summary for teacher dashboard
 *
 * Displays aggregated talent intelligence signals from the
 * intelligence_talent_profiles table.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  TrendingUp,
  Award,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TalentIntelligenceProfile } from "@/intelligence/talent/types/talent-intelligence.types";

interface TalentIntelligenceCardProps {
  profile: TalentIntelligenceProfile | null | undefined;
  isLoading?: boolean;
}

const readinessConfig = {
  early: { label: "Early Stage", color: "text-muted-foreground", bg: "bg-muted" },
  developing: { label: "Developing", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  ready: { label: "Career Ready", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  highly_ready: { label: "Highly Ready", color: "text-primary", bg: "bg-primary/10" },
};

const momentumConfig = {
  inactive: { label: "Inactive", icon: Target },
  emerging: { label: "Emerging", icon: TrendingUp },
  active: { label: "Active Learner", icon: Zap },
  accelerating: { label: "Accelerating", icon: Zap },
};

export default function TalentIntelligenceCard({
  profile,
  isLoading,
}: TalentIntelligenceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  const readiness = readinessConfig[profile.readinessLevel] ?? readinessConfig.early;
  const momentum = momentumConfig[profile.growthMomentum] ?? momentumConfig.inactive;
  const MomentumIcon = momentum.icon;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Talent Intelligence
            </h3>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-2", readiness.color)}
          >
            {readiness.label}
          </Badge>
        </div>

        {/* CRI Score */}
        <div className="flex items-center gap-4">
          <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center", readiness.bg)}>
            <span className={cn("text-xl font-bold", readiness.color)}>
              {Math.round(profile.criScore)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Career Readiness Index</p>
            <div className="flex items-center gap-2 mt-1">
              <MomentumIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{momentum.label}</span>
            </div>
          </div>
        </div>

        {/* Signal Summary Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/50 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-sm font-bold text-foreground">
                {profile.verifiedSignalCount}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Verified</p>
          </div>

          <div className="rounded-lg border border-border/50 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Award className="h-3 w-3 text-primary" />
              <span className="text-sm font-bold text-foreground">
                {profile.credentialCount}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Credentials</p>
          </div>

          <div className="rounded-lg border border-border/50 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-sm font-bold text-foreground">
                {profile.unresolvedGapCount}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Gaps</p>
          </div>
        </div>

        {/* Credential Strength — dormant field activation */}
        {profile.credentialStrength && profile.credentialStrength !== "none" && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Credential Strength:</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-2 capitalize", {
                "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800": profile.credentialStrength === "strong" || profile.credentialStrength === "exceptional",
                "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800": profile.credentialStrength === "moderate",
                "text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-800": profile.credentialStrength === "basic",
              })}
            >
              {profile.credentialStrength}
            </Badge>
          </div>
        )}

        {/* Gap Categories — dormant field activation */}
        {profile.gapCategories.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Gap Focus Areas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.gapCategories.slice(0, 4).map((cat, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
                  {cat}
                </Badge>
              ))}
              {profile.gapCategories.length > 4 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                  +{profile.gapCategories.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Hiring Advantage Badges */}
        {profile.hiringAdvantageSignals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Hiring Advantages
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.hiringAdvantageSignals.slice(0, 4).map((signal, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5"
                >
                  {signal.label}
                </Badge>
              ))}
              {profile.hiringAdvantageSignals.length > 4 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                  +{profile.hiringAdvantageSignals.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
