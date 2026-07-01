/**
 * JobFitIntelligence — Auth-aware intelligence block for Job Detail
 *
 * Only renders for authenticated teachers with a talent profile.
 * Shows fit label, why-fit explainability, hiring badges, and CTA.
 *
 * Phase 7B — Hiring Surface Intelligence
 */

import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { useTalentIntelligenceProfile } from "@/intelligence/talent/hooks/useTalentIntelligenceProfile";
import { explainMatch } from "@/intelligence/explainability/adapters/talent-profile-explanation.adapter";
import { resolveMatchLabel, MATCH_LABEL_STYLES } from "@/lib/match-labels";
import ExplanationSection from "@/components/intelligence/ExplanationSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobFitIntelligenceProps {
  jobId: string;
}


const SIGNAL_ICON: Record<string, typeof Sparkles> = {
  verified_teaching_practice: ShieldCheck,
  credential_strength: Award,
  pathway_achieved: TrendingUp,
  growth_momentum: TrendingUp,
  gap_closure: ShieldCheck,
  mentor_validated: ShieldCheck,
};

const JobFitIntelligence = ({ jobId }: JobFitIntelligenceProps) => {
  const { user, roles } = useAuth();
  const isTeacher = roles.includes("teacher");

  // Don't render anything for non-teachers
  if (!user || !isTeacher) return null;

  return <JobFitContent jobId={jobId} />;
};

/** Inner component — only mounted when auth guard passes */
const JobFitContent = ({ jobId }: { jobId: string }) => {
  const { data: teacherId } = useTeacherProfileId();
  const { data: talentProfile } = useTalentIntelligenceProfile(teacherId ?? undefined);

  // Need at least teacher profile to show anything
  if (!teacherId || !talentProfile) return null;

  const matchScore = talentProfile.bestMatchScore;
  const fitLabel = resolveMatchLabel(matchScore);
  const matchExplanation = explainMatch(talentProfile);
  const advantages = talentProfile.hiringAdvantageSignals.slice(0, 3);
  const isStrong = fitLabel === "Strong";

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-5 space-y-4">
        {/* Fit Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Your Fit for This Role</h3>
          </div>
          <Badge variant="outline" className={cn("text-xs font-semibold px-2 py-0.5 h-auto", MATCH_LABEL_STYLES[fitLabel])}>
            {fitLabel}
          </Badge>
        </div>

        {/* Explainability */}
        {matchExplanation && (
          <ExplanationSection explanation={matchExplanation} className="border-0 bg-transparent p-0" />
        )}

        {/* Hiring Advantage Badges */}
        {advantages.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground font-medium">
              Signals that strengthen your position
            </p>
            <div className="flex flex-wrap gap-1.5">
              {advantages.map((s, i) => {
                const Icon = SIGNAL_ICON[s.type] ?? Sparkles;
                return (
                  <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                    <Icon className="h-3 w-3" /> {s.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
          <Link to="/app/teacher/talent-profile">
            {isStrong ? "View your Professional Intelligence" : "Improve your fit"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default JobFitIntelligence;
