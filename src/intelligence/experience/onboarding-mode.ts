/**
 * Onboarding Mode — Experience Layer
 *
 * Detects whether a user is in "onboarding" mode and applies
 * surface-specific exposure limits to reduce echo/amplification.
 *
 * ⚠️ This is a PRESENTATION layer only.
 * It does NOT modify engines, orchestrator, or contracts.
 * It runs AFTER useSurfaceRecommendations() at the consumption point.
 */

import type { UserSegment } from "@/intelligence/recommendations/personalization";
import type { SurfaceType } from "@/intelligence/recommendations/distribution/surface-contracts";

// ── Experience Mode ───────────────────────────────────────────

export type ExperienceMode = "onboarding" | "normal";

export function getUserExperienceMode(
  segment: UserSegment,
  completedActionCount: number,
  accountCreatedAt?: string | null,
): ExperienceMode {
  if (segment === "beginner") return "onboarding";
  if (completedActionCount === 0) return "onboarding";

  if (accountCreatedAt) {
    const ageMs = Date.now() - new Date(accountCreatedAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (ageMs < sevenDaysMs) return "onboarding";
  }

  return "normal";
}

// ── Surface Exposure Limits ───────────────────────────────────

const ONBOARDING_LIMITS: Partial<Record<SurfaceType, number>> = {
  dashboard: 3,           // primary(1) + secondary(max 1) + buffer
  recommendations_page: 2,
  skills: 1,
  cri: 1,
  // contextbar: no limit change
};

export function applyOnboardingSurfacePolicy<T>(
  surface: SurfaceType,
  items: T[],
): T[] {
  const limit = ONBOARDING_LIMITS[surface];
  if (limit == null) return items;
  return items.slice(0, limit);
}

// ── Onboarding Messages ───────────────────────────────────────

const ONBOARDING_MESSAGES: Partial<Record<SurfaceType, string>> = {
  recommendations_page:
    "We're still learning about you. Complete a few steps to unlock better recommendations.",
  skills:
    "Complete your profile to unlock more accurate skill insights.",
  cri:
    "Your readiness insights will improve as you complete more steps.",
  // dashboard: no message (keep it clean)
};

export function getOnboardingSurfaceMessage(
  surface: SurfaceType,
): string | null {
  return ONBOARDING_MESSAGES[surface] ?? null;
}
