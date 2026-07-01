import { useOnboardingSnapshot } from "@/hooks/useOnboardingSnapshot";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";

/**
 * Lightweight shell-level banner that surfaces incomplete onboarding
 * for the user's current shell area. Renders nothing when onboarding
 * is complete or loading.
 */
export function OnboardingBanner() {
  const snapshot = useOnboardingSnapshot();

  if (snapshot.isLoading || !snapshot.hasBlockingOnboarding || !snapshot.blockingRoute) {
    return null;
  }

  const labels: Record<string, string> = {
    teacher: "Complete your teacher profile to unlock all features.",
    school: "Complete your school setup to access workspace tools.",
    mentor: "Finish your mentor setup to activate your workspace.",
    provider: "Complete your provider setup to access the portal.",
  };

  const message = snapshot.blockingPersona
    ? labels[snapshot.blockingPersona] ?? "Complete your setup to continue."
    : "Complete your setup to continue.";

  return (
    <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1">{message}</span>
      <Link
        to={snapshot.blockingRoute}
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        Continue setup
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
