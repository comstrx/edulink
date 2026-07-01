/**
 * Intelligence Read Models — Selectors
 *
 * UI-safe access patterns that wrap the repository and return
 * convenient shapes for components. Handles null / stale gracefully.
 *
 * No scoring. No computation. Read-only surface.
 *
 * Workstream 2B
 */

import type {
  TeacherCriSnapshot,
  TeacherJobMatchSnapshot,
  TeacherGapSnapshot,
  TeacherRecommendationsSnapshot,
  TeacherVerifiedStateSnapshot,
  SnapshotStaleness,
} from "../types/intelligence-read-models.types";
import type { SnapshotResult } from "../repositories/intelligence-read-models.repository";

// ── UI-safe wrapper ────────────────────────────────────────────

export interface ReadModelView<T> {
  /** The snapshot data, or null if unavailable */
  data: T | null;
  /** Whether a snapshot was found at all */
  available: boolean;
  /** Freshness state for UI indicators */
  freshness: SnapshotStaleness | "unavailable";
}

// ── Selector helpers ───────────────────────────────────────────

/** Convert a SnapshotResult into a UI-safe ReadModelView. */
export function toView<T>(result: SnapshotResult<T>): ReadModelView<T> {
  switch (result.status) {
    case "found":
      return { data: result.data, available: true, freshness: result.data && typeof result.data === "object" && "meta" in result.data ? ((result.data as any).meta?.staleness ?? "fresh") : "fresh" };
    case "stale":
      return { data: result.data, available: true, freshness: "stale" };
    case "not_found":
      return { data: null, available: false, freshness: "unavailable" };
  }
}

// ── Typed selectors ────────────────────────────────────────────

export function selectCriView(result: SnapshotResult<TeacherCriSnapshot>): ReadModelView<TeacherCriSnapshot> {
  return toView(result);
}

export function selectMatchView(result: SnapshotResult<TeacherJobMatchSnapshot>): ReadModelView<TeacherJobMatchSnapshot> {
  return toView(result);
}

export function selectGapView(result: SnapshotResult<TeacherGapSnapshot>): ReadModelView<TeacherGapSnapshot> {
  return toView(result);
}

export function selectRecommendationsView(result: SnapshotResult<TeacherRecommendationsSnapshot>): ReadModelView<TeacherRecommendationsSnapshot> {
  return toView(result);
}

export function selectVerifiedStateView(result: SnapshotResult<TeacherVerifiedStateSnapshot>): ReadModelView<TeacherVerifiedStateSnapshot> {
  return toView(result);
}

// ── Convenience: score-only selectors ──────────────────────────

/** Extract just the CRI score or null. */
export function selectCriScore(result: SnapshotResult<TeacherCriSnapshot>): number | null {
  return result.status === "not_found" ? null : result.data.score;
}

/** Extract just the match score or null. */
export function selectMatchScore(result: SnapshotResult<TeacherJobMatchSnapshot>): number | null {
  return result.status === "not_found" ? null : result.data.score;
}

/** Extract gap count or null. */
export function selectGapCount(result: SnapshotResult<TeacherGapSnapshot>): number | null {
  return result.status === "not_found" ? null : result.data.totalGaps;
}

/** Extract overall verification status or null. */
export function selectVerificationStatus(result: SnapshotResult<TeacherVerifiedStateSnapshot>): string | null {
  return result.status === "not_found" ? null : result.data.overallStatus;
}
