/**
 * OnboardingSurfaceBanner — Contextual onboarding hint per surface.
 * Renders only in onboarding mode with a message.
 */

import { Info } from "lucide-react";

interface Props {
  message: string | null;
}

export default function OnboardingSurfaceBanner({ message }: Props) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3">
      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground leading-snug">{message}</p>
    </div>
  );
}
