/**
 * Dashboard Nudges — Lightweight behavioral nudges
 *
 * Derives nudge messages from existing recommendation data + localStorage visit timestamps.
 * No backend, no cron, no push notifications — pure client-side presentation logic.
 */

const LAST_VISIT_KEY = "edulink_dashboard_last_visit";
const LAST_ACTION_KEY = "edulink_dashboard_last_action";

// ── Visit tracking (localStorage only) ──────────────────────

export function recordDashboardVisit(): void {
  try {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  } catch { /* silent */ }
}

export function recordActionTaken(): void {
  try {
    localStorage.setItem(LAST_ACTION_KEY, new Date().toISOString());
  } catch { /* silent */ }
}

function getHoursSince(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const diff = Date.now() - new Date(raw).getTime();
    return diff / (1000 * 60 * 60);
  } catch {
    return null;
  }
}

// ── Nudge Types ─────────────────────────────────────────────

export type NudgeType =
  | "returning_inactive"
  | "pending_actions"
  | "incomplete_profile"
  | "priority_reminder"
  | null;

export interface DashboardNudge {
  type: NudgeType;
  message: string;
  subtext: string;
  urgency: "low" | "medium" | "high";
}

// ── Nudge Derivation ────────────────────────────────────────

/**
 * Derives the most relevant nudge from existing recommendation state.
 * Priority: returning_inactive > incomplete_profile > pending_actions > priority_reminder
 */
export function deriveDashboardNudge(recs: {
  actionType: string;
  status?: string;
  priority: string;
}[]): DashboardNudge | null {
  const activeRecs = recs.filter((r) => r.status !== "completed");
  if (activeRecs.length === 0) return null;

  const hoursSinceVisit = getHoursSince(LAST_VISIT_KEY);
  const hoursSinceAction = getHoursSince(LAST_ACTION_KEY);

  // 1) Returning after inactivity (>48h since last visit)
  if (hoursSinceVisit !== null && hoursSinceVisit > 48) {
    return {
      type: "returning_inactive",
      message: "Welcome back — you have pending actions",
      subtext: `${activeRecs.length} recommendation${activeRecs.length !== 1 ? "s" : ""} waiting for you`,
      urgency: "high",
    };
  }

  // 2) Has profile completion action → incomplete profile nudge
  const hasProfileAction = activeRecs.some(
    (r) => r.actionType === "profile_completion_action",
  );
  if (hasProfileAction) {
    return {
      type: "incomplete_profile",
      message: "Your profile needs attention",
      subtext: "Complete your profile to unlock better opportunities",
      urgency: "high",
    };
  }

  // 3) Has actions but no recent action taken (>24h)
  if (hoursSinceAction !== null && hoursSinceAction > 24 && activeRecs.length > 0) {
    return {
      type: "pending_actions",
      message: "You still have pending growth actions",
      subtext: "Taking action now improves your chances",
      urgency: "medium",
    };
  }

  // 4) First visit ever (no stored timestamp) with active recs
  if (hoursSinceVisit === null && activeRecs.length > 0) {
    return {
      type: "priority_reminder",
      message: "Start with your most important action",
      subtext: "Focus on the highlighted recommendation below",
      urgency: "low",
    };
  }

  // 5) Has high/critical priority items
  const hasHighPriority = activeRecs.some(
    (r) => r.priority === "high" || r.priority === "critical",
  );
  if (hasHighPriority) {
    return {
      type: "priority_reminder",
      message: "You have a high-priority action",
      subtext: "Completing it now will improve your career readiness",
      urgency: "medium",
    };
  }

  return null;
}

// ── Daily Hook ──────────────────────────────────────────────

/**
 * Derives a daily-hook headline from active recommendations.
 * Always anchored to the top action count.
 */
export function getDailyHookLine(activeCount: number): string | null {
  if (activeCount === 0) return null;
  if (activeCount === 1) return "You have 1 important step today";
  return `You have ${activeCount} steps to grow today`;
}

// ── Continuity Line ─────────────────────────────────────────

/**
 * Returns a continuity/momentum message based on action history.
 */
export function getContinuityLine(recs: {
  status?: string;
}[]): string | null {
  const completed = recs.filter((r) => r.status === "completed").length;
  const active = recs.filter((r) => r.status !== "completed").length;

  if (completed > 0 && active > 0) {
    return "Keep going — you're building momentum";
  }
  if (active > 0) {
    return "You're close to improving your profile";
  }
  return null;
}

// ── Micro-Reward Messages ───────────────────────────────────

const MICRO_REWARDS = [
  "Great step forward! 🎯",
  "You're making progress! ✨",
  "Nice move — keep it up! 💪",
  "One step closer to your goals! 🚀",
];

export function getRandomMicroReward(): string {
  return MICRO_REWARDS[Math.floor(Math.random() * MICRO_REWARDS.length)];
}

// ── Nudge Styles ────────────────────────────────────────────

export const NUDGE_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  high: {
    bg: "bg-destructive/[0.06]",
    border: "border-destructive/20",
    text: "text-destructive",
    icon: "text-destructive",
  },
  medium: {
    bg: "bg-primary/[0.06]",
    border: "border-primary/20",
    text: "text-primary",
    icon: "text-primary",
  },
  low: {
    bg: "bg-muted/50",
    border: "border-border",
    text: "text-muted-foreground",
    icon: "text-muted-foreground",
  },
};
