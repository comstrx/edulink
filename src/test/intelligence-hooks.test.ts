/**
 * Step 8B — Intelligence Consumption Hooks Tests
 *
 * Tests adapter behavior for all status states that hooks rely on.
 * Hook internals delegate to adapters + selectors, so we test the
 * contract at the adapter level (no React rendering needed).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SnapshotResult } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type {
  TeacherCriSnapshot,
  TeacherJobMatchSnapshot,
  TeacherGapSnapshot,
} from "@/intelligence/read-models/types/intelligence-read-models.types";
import {
  adaptCriSnapshot,
  adaptMatchSnapshot,
  adaptGapSnapshot,
  errorResult,
  loadingResult,
} from "@/intelligence/consumption/adapters/intelligence-consumption.adapters";

const TEACHER_ID = "teacher-hook-001";
const JOB_ID = "job-hook-001";

// Use recent timestamps so freshness checks pass
const RECENT_TIMESTAMP = new Date(Date.now() - 60 * 1000).toISOString();

const freshCri: TeacherCriSnapshot = {
  teacherId: TEACHER_ID,
  jobId: JOB_ID,
  score: 85,
  dimensions: [{ dimension: "subjects", label: "Subjects", score: 20, maxScore: 20, matched: true }],
  gapTermIds: [],
  meta: { computedAt: RECENT_TIMESTAMP, staleness: "fresh", engineVersion: "cri-v1" },
};

const staleCri: TeacherCriSnapshot = {
  ...freshCri,
  score: 60,
  meta: { computedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), staleness: "stale", engineVersion: "cri-v1" },
};

describe("Step 8B — Hook Contract Tests", () => {
  describe("snapshot exists and is fresh", () => {
    it("returns ready with data", () => {
      const result = adaptCriSnapshot({ status: "found", data: freshCri });
      expect(result.status).toBe("ready");
      expect(result.data?.score).toBe(85);
      expect(result.metadata.isStale).toBe(false);
      expect(result.metadata.freshnessStatus).toBe("fresh");
    });
  });

  describe("snapshot exists but stale", () => {
    it("returns stale with preserved data", () => {
      const result = adaptCriSnapshot({ status: "stale", data: staleCri });
      expect(result.status).toBe("stale");
      expect(result.data?.score).toBe(60);
      expect(result.data).not.toBeNull();
    });

    it("marks metadata as stale from snapshot staleness field", () => {
      const result = adaptCriSnapshot({ status: "found", data: staleCri });
      expect(result.metadata.isStale).toBe(true);
      expect(result.metadata.freshnessStatus).toBe("stale");
    });
  });

  describe("snapshot missing", () => {
    it("CRI returns empty with null data", () => {
      const result = adaptCriSnapshot({ status: "not_found" });
      expect(result.status).toBe("empty");
      expect(result.data).toBeNull();
      expect(result.metadata.missingReason).toBe("never_computed");
    });

    it("Match returns empty with null data", () => {
      const result = adaptMatchSnapshot({ status: "not_found" });
      expect(result.status).toBe("empty");
      expect(result.data).toBeNull();
    });

    it("Gap returns empty with null data", () => {
      const result = adaptGapSnapshot({ status: "not_found" });
      expect(result.status).toBe("empty");
      expect(result.data).toBeNull();
    });
  });

  describe("repository error", () => {
    it("returns structured error result", () => {
      const result = errorResult("Connection refused");
      expect(result.status).toBe("error");
      expect(result.error).toBe("Connection refused");
      expect(result.data).toBeNull();
      expect(result.metadata.missingReason).toBe("fetch_failed");
    });
  });

  describe("loading state", () => {
    it("returns loading with null data", () => {
      const result = loadingResult();
      expect(result.status).toBe("loading");
      expect(result.data).toBeNull();
      expect(result.error).toBeUndefined();
    });
  });

  describe("match hook with missing jobId", () => {
    it("match not_found returns empty (simulates undefined jobId path)", () => {
      const result = adaptMatchSnapshot({ status: "not_found" });
      expect(result.status).toBe("empty");
      expect(result.data).toBeNull();
      expect(result.metadata.computedAt).toBeNull();
    });
  });
});
