/**
 * useVisitorViewLimit — Soft UX nudge for unauthenticated visitors.
 *
 * ⚠️ SOFT LIMIT ONLY — NOT A SECURITY MECHANISM ⚠️
 *
 * This uses localStorage to track how many teacher profiles a visitor has
 * viewed. It is trivially bypassable (clear storage, incognito, etc.)
 * and exists solely as a UX nudge to encourage sign-up.
 *
 * If real view-limiting is needed, enforce it server-side via rate limiting
 * or session-based tracking in the database.
 */
const STORAGE_KEY = "edulink_visitor_views";
const SOFT_VIEW_LIMIT = 5;

function getViewedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useVisitorViewLimit() {
  const viewedIds = getViewedIds();

  const recordView = (profileId: string) => {
    const ids = getViewedIds();
    if (!ids.includes(profileId)) {
      const updated = [...ids, profileId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  /** Soft check — not a security gate */
  const canView = (profileId: string): boolean => {
    const ids = getViewedIds();
    if (ids.includes(profileId)) return true;
    return ids.length < SOFT_VIEW_LIMIT;
  };

  return {
    canView,
    recordView,
    viewCount: viewedIds.length,
    limit: SOFT_VIEW_LIMIT,
  };
}
