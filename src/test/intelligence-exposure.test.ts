/**
 * Phase 4.1 — Intelligence Exposure Layer Tests
 *
 * Extends Phase 4A tests with rejection adapter, exposure-aware hooks logic,
 * and audience resolution edge cases.
 */

import { describe, it, expect } from "vitest";
import { EXPOSURE_MATRIX, getExposureLevel } from "@/intelligence/exposure/rules/exposure-rules";
import { exposeCri } from "@/intelligence/exposure/adapters/cri-exposure.adapter";
import { exposeMatch } from "@/intelligence/exposure/adapters/match-exposure.adapter";
import { exposeGap } from "@/intelligence/exposure/adapters/gap-exposure.adapter";
import { exposeRecommendation } from "@/intelligence/exposure/adapters/recommendation-exposure.adapter";
import { exposeVerification } from "@/intelligence/exposure/adapters/verification-exposure.adapter";
import { exposeRejection } from "@/intelligence/exposure/adapters/rejection-exposure.adapter";
import { resolveExposureAudience } from "@/intelligence/exposure/hooks/useExposureAudience";
import type { CriConsumptionData, MatchConsumptionData, GapConsumptionData, RecommendationConsumptionData, VerifiedStateConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { RejectionSourceData } from "@/intelligence/exposure/adapters/rejection-exposure.adapter";

// ── Fixtures ───────────────────────────────────────────────────

const criData: CriConsumptionData = {
  score: 72,
  band: "moderate",
  dimensions: [
    { dimension: "subjects", label: "Subjects", score: 18, maxScore: 20, met: true },
    { dimension: "location", label: "Location", score: 5, maxScore: 10, met: false },
  ],
  gapTermIds: ["term-1"],
  jobId: "job-1",
};

const matchData: MatchConsumptionData = {
  score: 65,
  confidence: "medium",
  dimensions: [
    { dimension: "subjects", label: "Subjects", score: 18, maxScore: 20, matched: true, reason: "3/4 matched" },
    { dimension: "location", label: "Location", score: 5, maxScore: 10, matched: false, reason: "Different country" },
  ],
  matchedTermIds: ["t1"],
  unmatchedTermIds: ["t2"],
  jobId: "job-1",
};

const gapData: GapConsumptionData = {
  gaps: [
    { gapId: "g1", gapType: "cert", label: "CELTA", severity: "high", confidence: "medium", category: "certification", taxonomyTermId: "c1", evidenceSources: ["job"] },
  ],
  totalGaps: 1,
  priorityGapIds: ["g1"],
  groupedSummary: [{ category: "certification", count: 1, highestSeverity: "high" }],
  jobId: null,
};

const recData: RecommendationConsumptionData = {
  recommendations: [
    { recommendationId: "r1", type: "training", priority: "high", confidence: "medium", reasonCodes: ["gap"], relatedGapIds: ["c1"], groupKey: "training_actions", actionLabelKey: "training_recommendation", targetId: "course-1" },
  ],
  topRecommendationIds: ["r1"],
  totalCount: 1,
  groupedSummary: [],
};

const verifiedData: VerifiedStateConsumptionData = {
  overallStatus: "partial",
  credentials: [
    { termId: "c1", credentialType: "certification", verified: true, verifiedAt: "2026-01-01" },
    { termId: "d1", credentialType: "degree", verified: false },
  ],
  verifiedCount: 1,
  totalCount: 2,
};

const rejectionData: RejectionSourceData = {
  rejectionReasonTermId: "rr-1",
  rejectionReasonLabel: "Insufficient experience",
  rejectionNotes: "Needs 3+ years classroom experience",
};

// ── Tests ──────────────────────────────────────────────────────

describe("Phase 4.1 — Exposure Rules (including rejection)", () => {
  it("returns correct exposure levels from matrix", () => {
    expect(getExposureLevel("cri", "teacher")).toBe("full");
    expect(getExposureLevel("cri", "school")).toBe("summary");
    expect(getExposureLevel("cri", "public")).toBe("hidden");
    expect(getExposureLevel("match", "school")).toBe("full");
    expect(getExposureLevel("match", "teacher")).toBe("summary");
    expect(getExposureLevel("recommendation", "school")).toBe("summary");
    expect(getExposureLevel("verification", "public")).toBe("badge");
  });

  it("rejection rules: teacher=summary, school=full, public=hidden", () => {
    expect(getExposureLevel("rejection", "teacher")).toBe("summary");
    expect(getExposureLevel("rejection", "school")).toBe("full");
    expect(getExposureLevel("rejection", "public")).toBe("hidden");
    expect(getExposureLevel("rejection", "admin")).toBe("full");
  });

  it("defaults to hidden for unknown lookups", () => {
    expect(getExposureLevel("cri" as any, "unknown" as any)).toBe("hidden");
  });
});

describe("Phase 4.1 — CRI Exposure Adapter", () => {
  it("teacher gets full CRI", () => {
    const result = exposeCri(criData, "teacher");
    expect(result.level).toBe("full");
    if (result.level === "full") {
      expect(result.score).toBe(72);
      expect(result.dimensions).toHaveLength(2);
    }
  });

  it("school gets summary CRI (banded)", () => {
    const result = exposeCri(criData, "school");
    expect(result.level).toBe("summary");
    if (result.level === "summary") {
      expect(result.band).toBe("moderate");
      expect(result.scoreBand).toBe("60–79");
      expect((result as any).score).toBeUndefined();
    }
  });

  it("public gets hidden CRI", () => {
    expect(exposeCri(criData, "public").level).toBe("hidden");
  });

  it("null data returns hidden", () => {
    expect(exposeCri(null, "teacher").level).toBe("hidden");
  });
});

describe("Phase 4.1 — Match Exposure Adapter", () => {
  it("school gets full match", () => {
    const result = exposeMatch(matchData, "school");
    expect(result.level).toBe("full");
    if (result.level === "full") {
      expect(result.score).toBe(65);
      expect(result.dimensions).toHaveLength(2);
    }
  });

  it("teacher gets summary match (strengths/gaps)", () => {
    const result = exposeMatch(matchData, "teacher");
    expect(result.level).toBe("summary");
    if (result.level === "summary") {
      expect(result.strengths).toContain("Subjects");
      expect(result.gaps).toContain("Location");
    }
  });

  it("public gets hidden match", () => {
    expect(exposeMatch(matchData, "public").level).toBe("hidden");
  });
});

describe("Phase 4.1 — Gap Exposure Adapter", () => {
  it("teacher gets full gaps", () => {
    const result = exposeGap(gapData, "teacher");
    expect(result.level).toBe("full");
    if (result.level === "full") {
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0].label).toBe("CELTA");
    }
  });

  it("school gets summary gaps (count only)", () => {
    const result = exposeGap(gapData, "school");
    expect(result.level).toBe("summary");
    if (result.level === "summary") {
      expect(result.totalGaps).toBe(1);
      expect((result as any).gaps).toBeUndefined();
    }
  });
});

describe("Phase 4.1 — Recommendation Exposure Adapter", () => {
  it("teacher gets full recommendations", () => {
    expect(exposeRecommendation(recData, "teacher").level).toBe("full");
  });

  it("school gets summary recommendations (aggregate only)", () => {
    const result = exposeRecommendation(recData, "school");
    expect(result.level).toBe("summary");
    if (result.level === "summary") {
      expect(result.totalCount).toBe(1);
      expect(result.groupedAreas).toBeDefined();
    }
  });

  it("public gets hidden recommendations", () => {
    expect(exposeRecommendation(recData, "public").level).toBe("hidden");
  });
});

describe("Phase 4.1 — Verification Exposure Adapter", () => {
  it("teacher gets full verification", () => {
    const result = exposeVerification(verifiedData, "teacher");
    expect(result.level).toBe("full");
    if (result.level === "full") {
      expect(result.credentials).toHaveLength(2);
      expect(result.verifiedCount).toBe(1);
    }
  });

  it("school gets badge-only verification", () => {
    const result = exposeVerification(verifiedData, "school");
    expect(result.level).toBe("badge");
    if (result.level === "badge") {
      expect(result.overallStatus).toBe("partial");
      expect((result as any).credentials).toBeUndefined();
    }
  });

  it("public gets badge-only verification", () => {
    expect(exposeVerification(verifiedData, "public").level).toBe("badge");
  });
});

describe("Phase 4.1 — Rejection Exposure Adapter", () => {
  it("school gets full rejection (raw reason)", () => {
    const result = exposeRejection(rejectionData, "school");
    expect(result.level).toBe("full");
    if (result.level === "full") {
      expect(result.rejectionReasonLabel).toBe("Insufficient experience");
      expect(result.rejectionNotes).toBe("Needs 3+ years classroom experience");
    }
  });

  it("teacher gets summary rejection (improvement hint)", () => {
    const result = exposeRejection(rejectionData, "teacher");
    expect(result.level).toBe("summary");
    if (result.level === "summary") {
      expect(result.improvementHint).toContain("experience");
      expect((result as any).rejectionReasonLabel).toBeUndefined();
    }
  });

  it("public gets hidden rejection", () => {
    expect(exposeRejection(rejectionData, "public").level).toBe("hidden");
  });

  it("admin gets full rejection", () => {
    const result = exposeRejection(rejectionData, "admin");
    expect(result.level).toBe("full");
  });

  it("null data returns hidden", () => {
    expect(exposeRejection(null, "school").level).toBe("hidden");
  });
});

describe("Phase 4.1 — Audience Resolution", () => {
  it("unauthenticated → public", () => {
    expect(resolveExposureAudience(null, false)).toBe("public");
  });

  it("teacher role → teacher", () => {
    expect(resolveExposureAudience("teacher", true)).toBe("teacher");
  });

  it("school_admin → school", () => {
    expect(resolveExposureAudience("school_admin", true)).toBe("school");
  });

  it("school_recruiter → school", () => {
    expect(resolveExposureAudience("school_recruiter", true)).toBe("school");
  });

  it("school_academic_lead → school", () => {
    expect(resolveExposureAudience("school_academic_lead", true)).toBe("school");
  });

  it("admin → admin", () => {
    expect(resolveExposureAudience("admin", true)).toBe("admin");
  });

  it("unknown role → public (safe default)", () => {
    expect(resolveExposureAudience("unknown_role", true)).toBe("public");
  });

  it("undefined role with auth → public (safe default)", () => {
    expect(resolveExposureAudience(undefined, true)).toBe("public");
  });
});
