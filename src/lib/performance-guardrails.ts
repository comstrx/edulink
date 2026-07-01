/**
 * Performance Guardrails — Query Safety Constants & Utilities
 *
 * Centralizes page size limits, query timeout safety, and
 * performance monitoring helpers for all search surfaces.
 *
 * Phase 4.2 — Production Hardening
 */

// ── Page Size Limits ───────────────────────────────────────────

/** Default page sizes per search surface */
export const PAGE_SIZES = {
  talentSearch: 18,
  jobSearch: 12,
  applicants: 50,
  trainingCatalog: 12,
} as const;

/** Absolute maximum page size (prevents abuse via URL params) */
export const MAX_PAGE_SIZE = 100;

/** Enforce page size limits */
export function clampPageSize(requested: number, surface: keyof typeof PAGE_SIZES): number {
  const defaultSize = PAGE_SIZES[surface];
  if (!requested || requested <= 0) return defaultSize;
  return Math.min(requested, MAX_PAGE_SIZE);
}

// ── Query Safety ───────────────────────────────────────────────

/** Maximum number of IDs in an IN() filter (Supabase/PostgREST limit safety) */
export const MAX_IN_FILTER_IDS = 500;

/** Clamp an ID array for safe use in .in() filters */
export function clampIdList(ids: string[]): string[] {
  return ids.slice(0, MAX_IN_FILTER_IDS);
}

/** Safe page offset calculator with bounds checking */
export function safeOffset(page: number, pageSize: number): number {
  const safePage = Math.max(0, Math.floor(page));
  return safePage * pageSize;
}

// ── React Query Stale Times ────────────────────────────────────

/** Standardized stale times for different data categories */
export const STALE_TIMES = {
  /** Intelligence snapshots — rarely change, long cache */
  intelligenceSnapshot: 5 * 60 * 1000, // 5 minutes

  /** Search results — moderate freshness needed */
  searchResults: 60 * 1000, // 1 minute

  /** Taxonomy terms — very stable, long cache */
  taxonomy: 10 * 60 * 1000, // 10 minutes

  /** User profile data — moderate freshness */
  profile: 2 * 60 * 1000, // 2 minutes

  /** Verification state — matches intelligence cache */
  verificationState: 5 * 60 * 1000, // 5 minutes
} as const;

// ── Performance Observability ──────────────────────────────────

interface QueryPerfEntry {
  surface: string;
  durationMs: number;
  resultCount: number;
  timestamp: number;
  filters?: Record<string, unknown>;
}

const PERF_LOG_THRESHOLD_MS = 2000; // Log queries slower than 2s
const perfBuffer: QueryPerfEntry[] = [];
const MAX_PERF_BUFFER = 100;

/**
 * Track query performance. Automatically logs slow queries.
 * Returns the query result for chaining.
 */
export async function trackQueryPerf<T>(
  surface: string,
  queryFn: () => Promise<T>,
  meta?: { resultCount?: number; filters?: Record<string, unknown> },
): Promise<T> {
  const start = performance.now();
  try {
    const result = await queryFn();
    const durationMs = Math.round(performance.now() - start);

    const entry: QueryPerfEntry = {
      surface,
      durationMs,
      resultCount: meta?.resultCount ?? 0,
      timestamp: Date.now(),
      filters: meta?.filters,
    };

    // Buffer for observability
    perfBuffer.push(entry);
    if (perfBuffer.length > MAX_PERF_BUFFER) perfBuffer.shift();

    // Log slow queries
    if (durationMs > PERF_LOG_THRESHOLD_MS) {
      console.warn(
        `[perf] Slow query on ${surface}: ${durationMs}ms`,
        meta?.filters ? { filters: meta.filters } : "",
      );
    }

    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    console.error(`[perf] Query error on ${surface} after ${durationMs}ms`, error);
    throw error;
  }
}

/** Get recent performance entries (for debug/observability panels) */
export function getRecentPerfEntries(): readonly QueryPerfEntry[] {
  return perfBuffer;
}

/** Get average query time for a surface */
export function getAverageQueryTime(surface: string): number {
  const entries = perfBuffer.filter((e) => e.surface === surface);
  if (entries.length === 0) return 0;
  return Math.round(entries.reduce((sum, e) => sum + e.durationMs, 0) / entries.length);
}
