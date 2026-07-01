/**
 * VisibilityTrustIndicator — Compact status chip for the shell topbar.
 *
 * Shows a quick "Public" / "Private" badge plus verification count.
 * Designed to be minimal — a future settings page can expand on this.
 *
 * Sprint 8 — Visibility + Trust Normalization
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useEffectiveVisibility } from "@/hooks/useEffectiveVisibility";
import { useTrustSummary } from "@/hooks/useTrustSummary";
import { useShellSnapshot } from "@/hooks/useShellSnapshot";

export function VisibilityTrustIndicator() {
  const shell = useShellSnapshot();
  const visibility = useEffectiveVisibility();
  const trust = useTrustSummary();

  const { isPublic, publicLabel, verifiedCount } = useMemo(() => {
    let pub = false;
    let label = "Private";

    if (shell.isTeacher && visibility.canShowTeacherPublicProfile) {
      pub = true;
      label = "Public Profile";
    } else if (shell.isProvider && visibility.canShowProviderPublicProfile) {
      pub = true;
      label = "Provider Active";
    } else if (shell.hasActiveMentorProfile && visibility.canShowMentorPublicProfile) {
      pub = true;
      label = "Mentor Active";
    }

    return {
      isPublic: pub,
      publicLabel: label,
      verifiedCount: trust.verificationBadges.length,
    };
  }, [
    shell.isTeacher,
    shell.isProvider,
    shell.hasActiveMentorProfile,
    visibility.canShowTeacherPublicProfile,
    visibility.canShowProviderPublicProfile,
    visibility.canShowMentorPublicProfile,
    trust.verificationBadges,
  ]);

  // Don't render until both hooks have resolved — prevents stale flash
  if (visibility.resolvedState !== "resolved" || trust.resolvedState !== "resolved") return null;

  const tooltipLines: string[] = [];
  if (isPublic) tooltipLines.push(`✓ ${publicLabel}`);
  else tooltipLines.push("Profile not publicly visible");
  if (verifiedCount > 0)
    tooltipLines.push(`${verifiedCount} verification${verifiedCount > 1 ? "s" : ""}: ${trust.verificationBadges.join(", ")}`);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            {isPublic ? (
              <Badge variant="outline" className="gap-1 text-xs font-normal border-primary/30 text-primary">
                <Eye className="h-3 w-3" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
                <EyeOff className="h-3 w-3" />
                Private
              </Badge>
            )}
            {verifiedCount > 0 && (
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {tooltipLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
