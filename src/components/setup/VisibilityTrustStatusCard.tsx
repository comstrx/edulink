/**
 * VisibilityTrustStatusCard — Reusable card for setup/start pages.
 *
 * Shows current visibility state + verification badges so users
 * understand what is blocking (or enabling) their public exposure.
 *
 * Sprint 8 — Visibility + Trust Normalization
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { useEffectiveVisibility } from "@/hooks/useEffectiveVisibility";
import { useTrustSummary } from "@/hooks/useTrustSummary";
import { useShellSnapshot } from "@/hooks/useShellSnapshot";

interface Props {
  /** Which persona context to show. Defaults to primary role. */
  persona?: "teacher" | "mentor" | "provider" | "school";
}

const BADGE_LABELS: Record<string, string> = {
  email: "Email Verified",
  phone: "Phone Verified",
  teacher_identity: "Teacher Identity",
  mentor_verified: "Mentor Approved",
  provider_verified: "Provider Verified",
  school_verified: "School Verified",
};

export function VisibilityTrustStatusCard({ persona }: Props) {
  const shell = useShellSnapshot();
  const visibility = useEffectiveVisibility();
  const trust = useTrustSummary();

  // Use explicit resolvedState — don't render stale data during loading or when unavailable
  if (visibility.resolvedState !== "resolved" || trust.resolvedState !== "resolved") {
    return (
      <Card className="border-border">
        <CardContent className="pt-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading visibility status…
        </CardContent>
      </Card>
    );
  }

  const resolvedPersona = persona ?? (shell.primaryRole === "provider" ? "provider" : shell.isTeacher ? "teacher" : undefined);

  // Determine visibility for the active persona
  let isPublic = false;
  let visibilityReason = "Your profile is not publicly visible.";

  if (resolvedPersona === "teacher") {
    isPublic = visibility.canShowTeacherPublicProfile;
    if (!isPublic) {
      const reasons: string[] = [];
      if (!shell.isTeacher) reasons.push("No teacher role");
      else {
        if (visibility.settings?.profile_visibility !== "public") reasons.push("Account visibility is not set to public");
        // Domain flag info is in the hook; keep guidance generic
        reasons.push("Ensure your teacher profile is marked as public");
      }
      visibilityReason = reasons.join(". ") + ".";
    }
  } else if (resolvedPersona === "mentor") {
    isPublic = visibility.canShowMentorPublicProfile;
    if (!isPublic) visibilityReason = "Mentor must be active with completed onboarding.";
  } else if (resolvedPersona === "provider") {
    isPublic = visibility.canShowProviderPublicProfile;
    if (!isPublic) visibilityReason = "Provider must be in active status.";
  } else if (resolvedPersona === "school") {
    isPublic = visibility.canShowSchoolPublicProfile;
    if (!isPublic) visibilityReason = "School directory not yet available.";
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isPublic ? (
            <Eye className="h-4 w-4 text-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          Visibility & Trust
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Visibility status */}
        <div className="flex items-center gap-2">
          <Badge
            variant={isPublic ? "default" : "secondary"}
            className={isPublic ? "bg-primary text-primary-foreground" : ""}
          >
            {isPublic ? "Publicly Visible" : "Not Public"}
          </Badge>
        </div>
        {!isPublic && (
          <p className="text-xs text-muted-foreground">{visibilityReason}</p>
        )}

        {/* Verification badges */}
        {trust.verificationBadges.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {trust.verificationBadges.map((badge) => (
              <Badge
                key={badge}
                variant="outline"
                className="gap-1 text-xs font-normal border-primary/20 text-primary"
              >
                <ShieldCheck className="h-3 w-3" />
                {BADGE_LABELS[badge] ?? badge}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldX className="h-3.5 w-3.5" />
            No verifications yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
