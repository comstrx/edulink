/**
 * Freshness Policy — Unit Tests
 *
 * Step 9A — Freshness lifecycle helpers and status resolution
 */

import { describe, it, expect } from "vitest";
import {
  isSnapshotFresh,
  isSnapshotStale,
  canDisplaySnapshot,
  needsRecompute,
  classifyTimeFreshness,
  createMissingMetadata,
  markFreshMetadata,
  markInvalidatedMetadata,
  markStaleMetadata,
  markRecomputingMetadata,
  markFailedMetadata,
  resolveSnapshotFreshness,
  STALE_REASON,
} from "@/intelligence/freshness";

// ── Status Queries ─────────────────────────────────────────────

describe("isSnapshotFresh", () => {
  it("returns true only for fresh status", () => {
    expect(isSnapshotFresh(markFreshMetadata(new Date().toISOString()))).toBe(true);
    expect(isSnapshotFresh(createMissingMetadata())).toBe(false);
  });
});

describe("isSnapshotStale", () => {
  it("returns true for stale, invalidated, and failed", () => {
    const fresh = markFreshMetadata(new Date().toISOString());
    expect(isSnapshotStale(markStaleMetadata(fresh, ["test"]))).toBe(true);
    expect(isSnapshotStale(markInvalidatedMetadata(fresh, ["test"]))).toBe(true);
    expect(isSnapshotStale(markFailedMetadata(fresh, "err"))).toBe(true);
    expect(isSnapshotStale(fresh)).toBe(false);
  });
});

describe("canDisplaySnapshot", () => {
  it("returns false only for missing", () => {
    expect(canDisplaySnapshot(createMissingMetadata())).toBe(false);
    expect(canDisplaySnapshot(markFreshMetadata(new Date().toISOString()))).toBe(true);
  });

  it("returns true for stale — data is still displayable", () => {
    const stale = markStaleMetadata(markFreshMetadata(new Date().toISOString()), ["test"]);
    expect(canDisplaySnapshot(stale)).toBe(true);
  });
});

describe("needsRecompute", () => {
  it("returns true for missing, stale, invalidated, failed", () => {
    expect(needsRecompute(createMissingMetadata())).toBe(true);
    const fresh = markFreshMetadata(new Date().toISOString());
    expect(needsRecompute(markStaleMetadata(fresh, ["x"]))).toBe(true);
    expect(needsRecompute(markInvalidatedMetadata(fresh, ["x"]))).toBe(true);
    expect(needsRecompute(markFailedMetadata(fresh, "err"))).toBe(true);
  });

  it("returns false when already recomputing", () => {
    const recomputing = markRecomputingMetadata(markFreshMetadata(new Date().toISOString()));
    expect(needsRecompute(recomputing)).toBe(false);
  });

  it("returns false for fresh", () => {
    expect(needsRecompute(markFreshMetadata(new Date().toISOString()))).toBe(false);
  });
});

// ── Time-based Classification ──────────────────────────────────

describe("classifyTimeFreshness", () => {
  it("returns missing for null computedAt", () => {
    expect(classifyTimeFreshness(null, "cri")).toBe("missing");
  });

  it("returns fresh for recent computation", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 1000).toISOString(); // 1 second ago
    expect(classifyTimeFreshness(recent, "cri", now)).toBe("fresh");
  });

  it("returns stale after freshness TTL", () => {
    const now = new Date();
    const old = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago (CRI TTL = 24h)
    expect(classifyTimeFreshness(old, "cri", now)).toBe("stale");
  });

  it("returns expired after expiry TTL", () => {
    const now = new Date();
    const veryOld = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago (CRI expiry = 7d)
    expect(classifyTimeFreshness(veryOld, "cri", now)).toBe("expired");
  });

  it("respects different TTLs per snapshot type", () => {
    const now = new Date();
    const age13h = new Date(now.getTime() - 13 * 60 * 60 * 1000).toISOString();
    // Match has 12h freshness TTL, so 13h should be stale
    expect(classifyTimeFreshness(age13h, "match", now)).toBe("stale");
    // CRI has 24h freshness TTL, so 13h should be fresh
    expect(classifyTimeFreshness(age13h, "cri", now)).toBe("fresh");
  });
});

// ── Metadata Factories ─────────────────────────────────────────

describe("markInvalidatedMetadata", () => {
  it("preserves computedAt and adds reason codes", () => {
    const fresh = markFreshMetadata("2025-01-01T00:00:00Z");
    const inv = markInvalidatedMetadata(fresh, [STALE_REASON.PROFILE_UPDATED]);
    expect(inv.status).toBe("invalidated");
    expect(inv.computedAt).toBe("2025-01-01T00:00:00Z");
    expect(inv.staleReasonCodes).toContain(STALE_REASON.PROFILE_UPDATED);
    expect(inv.invalidatedAt).toBeTruthy();
  });

  it("deduplicates reason codes", () => {
    const fresh = markFreshMetadata("2025-01-01T00:00:00Z");
    const stale = markStaleMetadata(fresh, ["a", "b"]);
    const inv = markInvalidatedMetadata(stale, ["b", "c"]);
    expect(inv.staleReasonCodes).toEqual(["a", "b", "c"]);
  });
});

describe("markRecomputingMetadata", () => {
  it("sets recomputeInProgress to true", () => {
    const meta = markRecomputingMetadata(createMissingMetadata());
    expect(meta.status).toBe("recomputing");
    expect(meta.recomputeInProgress).toBe(true);
    expect(meta.recomputeRequestedAt).toBeTruthy();
  });
});

describe("markFailedMetadata", () => {
  it("clears recomputeInProgress and records failure", () => {
    const recomputing = markRecomputingMetadata(markFreshMetadata("2025-01-01T00:00:00Z"));
    const failed = markFailedMetadata(recomputing, "timeout");
    expect(failed.status).toBe("failed");
    expect(failed.recomputeInProgress).toBe(false);
    expect(failed.lastFailureReason).toBe("timeout");
    expect(failed.lastFailureAt).toBeTruthy();
  });
});

// ── Resolve from DB ────────────────────────────────────────────

describe("resolveSnapshotFreshness", () => {
  it("trusts DB invalidated status", () => {
    expect(resolveSnapshotFreshness("invalidated", "2025-01-01T00:00:00Z", "cri")).toBe("invalidated");
  });

  it("returns fresh for recent fresh DB row", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 1000).toISOString();
    expect(resolveSnapshotFreshness("fresh", recent, "cri", now)).toBe("fresh");
  });

  it("returns stale when time exceeds freshness TTL even if DB says fresh", () => {
    const now = new Date();
    const old = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    expect(resolveSnapshotFreshness("fresh", old, "cri", now)).toBe("stale");
  });

  it("returns invalidated when expired", () => {
    const now = new Date();
    const veryOld = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(resolveSnapshotFreshness("fresh", veryOld, "cri", now)).toBe("invalidated");
  });
});
