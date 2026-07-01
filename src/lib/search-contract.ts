/**
 * search-contract.ts — Canonical Search Hook Interface
 *
 * Every domain search hook (Jobs, Talent, Training, Schools) MUST
 * return a value that satisfies `SearchEngineReturn<TFilters, TResult, TSort>`.
 *
 * This contract guarantees a uniform API surface across all discovery
 * experiences, enabling shared pagination controls, filter chip bars,
 * result headers, and future cross-domain search features.
 *
 * Sprint 2A — Shared Search Architecture
 */

// ── State & Actions ─────────────────────────────────────────────

export interface SearchEngineReturn<
  TFilters,
  TResult,
  TSort extends string = string,
> {
  // ── State ──
  filters: TFilters;
  searchQuery: string;
  sortBy: TSort;
  currentPage: number;
  pageSize: number;

  // ── Results ──
  results: TResult[];
  totalCount: number;
  totalPages: number;
  isLoading: boolean;

  // ── Actions ──
  updateFilters: (partial: Partial<TFilters>) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: TSort) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

// ── Hook options ────────────────────────────────────────────────

export interface SearchEngineOptions<TFilters = unknown> {
  /** Seed filters (e.g. from URL or props) */
  initialFilters?: Partial<TFilters>;
  /** Gate the query (e.g. wait for auth or route readiness) */
  enabled?: boolean;
}
