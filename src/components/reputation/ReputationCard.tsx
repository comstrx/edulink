/**
 * ReputationCard — Progressive Domain Activation
 *
 * States:
 * - NOT STARTED: no reputation profile → purposeful CTA
 * - IN PROGRESS: score > 0 but low tier → partial indicators
 * - ACTIVE: meaningful data → full display
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, ChevronRight, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useTeacherReputation } from "@/reputation/hooks/useTeacherReputation";
import { DIMENSION_LABELS, ALL_DIMENSIONS } from "@/reputation/engine/reputation-weights";
import { cn } from "@/lib/utils";
import type { ReputationTier } from "@/reputation/types/reputation.types";

const TIER_LABELS: Record<ReputationTier, string> = {
  emerging: "Emerging",
  practitioner: "Practitioner",
  verified_practitioner: "Verified Practitioner",
  advanced_practitioner: "Advanced Practitioner",
  expert: "Expert",
  mentor_level: "Mentor-Level",
};

const TIER_COLORS: Record<ReputationTier, string> = {
  emerging: "bg-muted text-muted-foreground",
  practitioner: "bg-primary/10 text-primary",
  verified_practitioner: "bg-primary/20 text-primary",
  advanced_practitioner: "bg-accent text-accent-foreground",
  expert: "bg-primary text-primary-foreground",
  mentor_level: "bg-primary text-primary-foreground",
};

interface ReputationCardProps {
  teacherId?: string;
}

export default function ReputationCard({ teacherId }: ReputationCardProps) {
  const { profile, tierExplanation, isLoading } = useTeacherReputation(teacherId);

  if (!teacherId || isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Professional Reputation</h3>
          </div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  /* ═══ NOT STARTED ═══ */
  if (!profile) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Professional Reputation</h3>
              <p className="text-xs text-muted-foreground">Your verified credibility</p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 space-y-2.5">
            <p className="text-sm font-medium text-foreground">
              Build your reputation through verified achievements
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Complete training, earn credentials, and get mentor approvals to grow your professional reputation score.
            </p>
            <Link
              to="/app/teacher/training"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Award className="h-3 w-3" />
              Explore training
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ═══ IN PROGRESS — low score, emerging tier ═══ */
  const isEarlyStage = profile.credibilityTier === "emerging" && profile.reputationScore < 20;

  if (isEarlyStage) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Professional Reputation</h3>
            </div>
            <Badge className={cn("text-[10px]", TIER_COLORS[profile.credibilityTier])}>
              {TIER_LABELS[profile.credibilityTier]}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{profile.reputationScore}</p>
              <p className="text-[10px] text-muted-foreground">Score</p>
            </div>
            <div className="flex-1 rounded-lg border border-border/50 p-2.5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {profile.totalReputationEvents} event{profile.totalReputationEvents !== 1 ? "s" : ""} recorded
                {profile.verifiedSignalCount > 0 && ` · ${profile.verifiedSignalCount} verified`}
              </p>
            </div>
          </div>

          {tierExplanation?.nextTier && tierExplanation.blockers.length > 0 && (
            <div className="rounded-lg border border-border/50 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-primary" />
                <p className="text-[10px] font-semibold text-foreground">
                  Next: {TIER_LABELS[tierExplanation.nextTier]}
                </p>
              </div>
              {tierExplanation.blockers.slice(0, 2).map((b, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">{b}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ═══ ACTIVE — full display ═══ */
  const activeDimensions = ALL_DIMENSIONS.filter(
    (d) => (profile.dimensionScores[d] ?? 0) > 0
  );

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Professional Reputation</h3>
          </div>
          <Badge className={cn("text-[10px]", TIER_COLORS[profile.credibilityTier])}>
            {TIER_LABELS[profile.credibilityTier]}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{profile.reputationScore}</p>
            <p className="text-[10px] text-muted-foreground">Reputation Score</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/50 p-2 text-center">
              <p className="text-sm font-semibold text-foreground">{profile.totalReputationEvents}</p>
              <p className="text-[10px] text-muted-foreground">Events</p>
            </div>
            <div className="rounded-lg border border-border/50 p-2 text-center">
              <p className="text-sm font-semibold text-foreground">{profile.verifiedSignalCount}</p>
              <p className="text-[10px] text-muted-foreground">Verified</p>
            </div>
          </div>
        </div>

        {activeDimensions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Dimension Breakdown
            </p>
            {activeDimensions.map((dim) => {
              const score = profile.dimensionScores[dim] ?? 0;
              const maxForBar = 50;
              const pct = Math.min(100, (score / maxForBar) * 100);
              return (
                <div key={dim} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground">{DIMENSION_LABELS[dim]}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{score}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tierExplanation?.nextTier && tierExplanation.blockers.length > 0 && (
          <div className="rounded-lg border border-border/50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-primary" />
              <p className="text-[10px] font-semibold text-foreground">
                Next: {TIER_LABELS[tierExplanation.nextTier]}
              </p>
            </div>
            {tierExplanation.blockers.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
