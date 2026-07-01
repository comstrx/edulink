/**
 * Step 8A — Intelligence Consumption Layer Tests
 *
 * Verifies adapters correctly map read-model snapshots
 * into UI-safe ConsumptionResult wrappers.
 */

import { describe, it, expect } from "vitest";
import type { SnapshotResult } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type {
  TeacherCriSnapshot,
  TeacherJobMatchSnapshot,
  TeacherGapSnapshot,
  TeacherRecommendationsSnapshot,
  TeacherVerifiedStateSnapshot,
} from "@/intelligence/read-models/types/intelligence-read-models.types";
import {
  adaptCriSnapshot,
  adaptMatchSnapshot,
  adaptGapSnapshot,
  adaptRecommendationSnapshot,
  adaptVerifiedStateSnapshot,
  errorResult,
  loadingResult,
} from "@/intelligence/consumption/adapters/intelligence-consumption.adapters";

const TEACHER_ID = "teacher-consume-001";
const JOB_ID = "job-consume-001";

// ── Fixtures ───────────────────────────────────────────────────

// Use a recent timestamp to ensure freshness checks pass
const RECENT_TIMESTAMP = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago

const criSnap: TeacherCriSnapshot = {
  teacherId: TEACHER_ID,
  jobId: JOB_ID,
  score: 72,
  dimensions: [
    { dimension: "subjects", label: "Subjects", score: 18, maxScore: 20, matched: true },
    { dimension: "location", label: "Location", score: 5, maxScore: 10, matched: false },
  ],
  gapTermIds: ["term-loc-1"],
  meta: { computedAt: RECENT_TIMESTAMP, staleness: "fresh", engineVersion: "cri-v1" },
};

const matchSnap: TeacherJobMatchSnapshot = {
  teacherId: TEACHER_ID,
  jobId: JOB_ID,
  score: 65,
  confidence: "medium",
  dimensions: [
    { dimension: "subjects", label: "Subjects", score: 18, maxScore: 20, matched: true, reason: "3/4 subjects matched" },
  ],
  matchedTermIds: ["term-1"],
  unmatchedTermIds: ["term-2"],
  meta: { computedAt: RECENT_TIMESTAMP, staleness: "stale", engineVersion: "match-v1" },
};

const gapSnap: TeacherGapSnapshot = {
  teacherId: TEACHER_ID,
  jobId: null,
  gaps: [
    { termId: "cert-1", label: "CELTA", category: "certification", source: "job_requirement", severity: "medium" as const },
    { termId: "lang-1", label: "Arabic B2", category: "language", source: "profile_analysis", severity: "medium" as const },
  ],
  totalGaps: 2,
  meta: { computedAt: RECENT_TIMESTAMP, staleness: "fresh" },
};

const recSnap: TeacherRecommendationsSnapshot = {
  teacherId: TEACHER_ID,
  recommendations: [
    { recommendationId: "rec-1", recommendationType: "course_recommendation", type: "training", itemId: "course-1", priority: "high", confidence: "medium", reason: "addresses CELTA gap", reasonCodes: ["addresses_gaps"], actionLabelKey: "course_recommendation", groupKey: "training_actions", rank: 1, addressesGapTermIds: ["cert-1"], relatedTaxonomyTermIds: [] },
    { recommendationId: "rec-2", recommendationType: "pathway_recommendation", type: "pathway", itemId: "path-1", priority: "medium", confidence: "medium", reason: "career advancement", reasonCodes: ["career_advancement"], actionLabelKey: "pathway_recommendation", groupKey: "training_actions", rank: 2, addressesGapTermIds: [], relatedTaxonomyTermIds: [] },
  ],
  totalCount: 2,
  meta: { computedAt: RECENT_TIMESTAMP, staleness: "fresh" },
};

const verifiedSnap: TeacherVerifiedStateSnapshot = {
  teacherId: TEACHER_ID,
  overallStatus: "partial",
  credentials: [
    { termId: "cert-1", credentialType: "certification", verified: true, verifiedAt: "2026-01-15T00:00:00Z", verifiedBy: "admin" },
    { termId: "deg-1", credentialType: "degree", verified: false },
  ],
  verifiedCount: 1,
  totalCount: 2,
  meta: { computedAt: RECENT_TIMESTAMP, staleness: "fresh" },
};

// ── Tests ──────────────────────────────────────────────────────

describe("Step 8A — Intelligence Consumption Adapters", () => {
  describe("CRI adapter", () => {
    it("maps found snapshot to ready status", () => {
      const result = adaptCriSnapshot({ status: "found", data: criSnap });
      expect(result.status).toBe("ready");
      expect(result.data?.score).toBe(72);
      expect(result.data?.band).toBe("strong"); // 72 → canonical: strong (60-79)
      expect(result.data?.dimensions).toHaveLength(2);
      expect(result.metadata.freshnessStatus).toBe("fresh");
      expect(result.metadata.isStale).toBe(false);
    });

    it("maps not_found to empty status", () => {
      const result = adaptCriSnapshot({ status: "not_found" });
      expect(result.status).toBe("empty");
      expect(result.data).toBeNull();
      expect(result.metadata.missingReason).toBe("never_computed");
    });

    it("maps stale snapshot correctly", () => {
      const result = adaptCriSnapshot({ status: "stale", data: criSnap });
      expect(result.status).toBe("stale");
      expect(result.data?.score).toBe(72);
    });
  });

  describe("Match adapter", () => {
    it("maps found snapshot with stale metadata", () => {
      const result = adaptMatchSnapshot({ status: "found", data: matchSnap });
      expect(result.status).toBe("ready");
      expect(result.data?.score).toBe(65);
      expect(result.data?.confidence).toBe("medium");
      expect(result.metadata.freshnessStatus).toBe("stale");
      expect(result.metadata.isStale).toBe(true);
    });

    it("maps not_found to empty", () => {
      const result = adaptMatchSnapshot({ status: "not_found" });
      expect(result.status).toBe("empty");
      expect(result.data).toBeNull();
    });
  });

  describe("Gap adapter", () => {
    it("maps gaps with grouped summary", () => {
      const result = adaptGapSnapshot({ status: "found", data: gapSnap });
      expect(result.status).toBe("ready");
      expect(result.data?.totalGaps).toBe(2);
      expect(result.data?.gaps).toHaveLength(2);
      expect(result.data?.groupedSummary.length).toBeGreaterThan(0);
      expect(result.data?.priorityGapIds.length).toBeGreaterThan(0);
    });

    it("preserves taxonomy term IDs", () => {
      const result = adaptGapSnapshot({ status: "found", data: gapSnap });
      expect(result.data?.gaps[0].taxonomyTermId).toBe("cert-1");
    });
  });

  describe("Recommendation adapter", () => {
    it("maps recommendations with top IDs", () => {
      const result = adaptRecommendationSnapshot({ status: "found", data: recSnap });
      expect(result.status).toBe("ready");
      expect(result.data?.totalCount).toBe(2);
      expect(result.data?.recommendations).toHaveLength(2);
      expect(result.data?.topRecommendationIds.length).toBeGreaterThan(0);
    });

    it("preserves related gap IDs", () => {
      const result = adaptRecommendationSnapshot({ status: "found", data: recSnap });
      expect(result.data?.recommendations[0].relatedGapIds).toContain("cert-1");
    });
  });

  describe("Verified state adapter", () => {
    it("maps verified state correctly", () => {
      const result = adaptVerifiedStateSnapshot({ status: "found", data: verifiedSnap });
      expect(result.status).toBe("ready");
      expect(result.data?.overallStatus).toBe("partial");
      expect(result.data?.verifiedCount).toBe(1);
      expect(result.data?.totalCount).toBe(2);
      expect(result.data?.credentials).toHaveLength(2);
    });
  });

  describe("Utility results", () => {
    it("errorResult produces error status", () => {
      const result = errorResult("Network timeout");
      expect(result.status).toBe("error");
      expect(result.error).toBe("Network timeout");
      expect(result.metadata.missingReason).toBe("fetch_failed");
    });

    it("loadingResult produces loading status", () => {
      const result = loadingResult();
      expect(result.status).toBe("loading");
      expect(result.data).toBeNull();
    });
  });
});
