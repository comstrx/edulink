/**
 * ApplicantTalentSummary — School-facing intelligence summary for an applicant
 *
 * Reads from intelligence_talent_profiles to show aggregated signals
 * for a specific teacher in the hiring context.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle2,
  Award,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTalentIntelligenceProfile } from "@/intelligence/talent/hooks/useTalentIntelligenceProfile";

interface ApplicantTalentSummaryProps {
  teacherId: string;
}

const readinessColors: Record<string, string> = {
  early: "text-muted-foreground",
  developing: "text-amber-600",
  ready: "text-emerald-600",
  highly_ready: "text-primary",
};

export default function ApplicantTalentSummary({
  teacherId,
}: ApplicantTalentSummaryProps) {
  const { data: profile, isLoading } = useTalentIntelligenceProfile(teacherId);

  if (isLoading || !profile) return null;

  const color = readinessColors[profile.readinessLevel] ?? readinessColors.early;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Readiness */}
      <Badge variant="outline" className={cn("text-[10px] gap-1", color)}>
        <Shield className="h-2.5 w-2.5" />
        CRI {Math.round(profile.criScore)}
      </Badge>

      {/* Verified signals */}
      {profile.verifiedSignalCount > 0 && (
        <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600">
          <CheckCircle2 className="h-2.5 w-2.5" />
          {profile.verifiedSignalCount} Verified
        </Badge>
      )}

      {/* Credentials */}
      {profile.credentialCount > 0 && (
        <Badge variant="outline" className="text-[10px] gap-1 text-primary">
          <Award className="h-2.5 w-2.5" />
          {profile.credentialCount} Credentials
        </Badge>
      )}

      {/* Gaps */}
      {profile.unresolvedGapCount > 0 && (
        <Badge variant="outline" className="text-[10px] gap-1 text-amber-600">
          <AlertTriangle className="h-2.5 w-2.5" />
          {profile.unresolvedGapCount} Gaps
        </Badge>
      )}

      {/* Growth */}
      {(profile.growthMomentum === "active" || profile.growthMomentum === "accelerating") && (
        <Badge variant="outline" className="text-[10px] gap-1 text-primary">
          <TrendingUp className="h-2.5 w-2.5" />
          {profile.growthMomentum === "accelerating" ? "Accelerating" : "Active"}
        </Badge>
      )}
    </div>
  );
}
