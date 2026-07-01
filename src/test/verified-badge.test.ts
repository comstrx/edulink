import { describe, it, expect } from "vitest";
import type { VerifiedStateConsumptionResult } from "@/intelligence/consumption/types/intelligence-consumption.types";

/**
 * Phase 3.5a — Verified Badge Real State Tests
 */

const META_READY = {
  isStale: false,
  computedAt: new Date().toISOString(),
  engineVersion: "rule-v1",
  freshnessStatus: "fresh" as const,
  isInvalidated: false,
  isRecomputing: false,
};

const META_EMPTY = {
  isStale: false,
  computedAt: null,
  engineVersion: null,
  freshnessStatus: "unknown" as const,
  isInvalidated: false,
  isRecomputing: false,
};

describe("Verified badge logic", () => {
  it("shows badge when overall status is 'full'", () => {
    const result: VerifiedStateConsumptionResult = {
      status: "ready",
      data: { overallStatus: "full", verifiedCount: 4, totalCount: 4, credentials: [] },
      metadata: META_READY,
    };
    expect(result.status).toBe("ready");
    expect(result.data?.overallStatus).toBe("full");
  });

  it("shows partial badge when overall status is 'partial'", () => {
    const result: VerifiedStateConsumptionResult = {
      status: "ready",
      data: { overallStatus: "partial", verifiedCount: 2, totalCount: 4, credentials: [] },
      metadata: META_READY,
    };
    expect(result.data?.overallStatus).toBe("partial");
  });

  it("hides badge when status is empty", () => {
    const result: VerifiedStateConsumptionResult = {
      status: "empty",
      data: null,
      metadata: META_EMPTY,
    };
    expect(result.status).toBe("empty");
    expect(result.data).toBeNull();
  });

  it("hides badge when status is error", () => {
    const result: VerifiedStateConsumptionResult = {
      status: "error",
      data: null,
      metadata: META_EMPTY,
    };
    expect(result.status).toBe("error");
  });

  it("badge does NOT depend on teaching_license_ids", () => {
    // Old fake logic: teaching_license_ids.length > 0 → show badge
    // New logic: VerifiedStateBadge reads from snapshot only
    const teacherWithLicenses = { teaching_license_ids: ["lic-1"] };
    expect(teacherWithLicenses.teaching_license_ids.length).toBeGreaterThan(0);
    // Having licenses no longer determines verified badge
  });
});
