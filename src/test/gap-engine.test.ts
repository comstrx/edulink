/**
 * Gap Engine v1 — Computation + Pipeline Tests
 * Phase 6C/6D
 */

import { describe, it, expect } from "vitest";
import { runGapEngine } from "@/intelligence/gaps/engine/gap-engine";
import type {
  GapEngineInput,
  GapProfileSignals,
  GapQualificationSignals,
  GapTrustSignals,
  GapTrainingSignals,
  GapHiringSignals,
  GapMatchSignals,
} from "@/intelligence/gaps/engine/gap-engine.types";

const ep: GapProfileSignals = {
  missingHeadline: false, missingBio: false, missingAvatar: false,
  missingSubjectMappings: false, missingCurriculumMappings: false,
  missingGradeBandMappings: false, missingExperienceEntries: false,
  missingEducationEntries: false, missingLanguageEntries: false,
  missingContactEmail: false, missingCvUrl: false, missingLocation: false,
  profileCompletenessScore: 100,
};
const eq: GapQualificationSignals = {
  certificationIds: ["c1"], licenseIds: ["l1"], degreeIds: ["d1"],
  skillIds: ["s1"], missingRequiredCertificationIds: [], missingRequiredSkillIds: [],
};
const et: GapTrustSignals = {
  identityVerified: true, educationVerified: true,
  experienceVerified: true, credentialVerified: true, missingVerificationTypes: [],
};
const etr: GapTrainingSignals = {
  completedCourseCount: 2, completedPathwayCount: 1,
  relevantTrainingTermIds: ["tr1"], hasNoTraining: false,
};
const eh: GapHiringSignals = {
  totalApplications: 0, totalRejections: 0,
  totalShortlists: 0, totalInterviews: 0, rejectionReasonIds: [],
};
const em: GapMatchSignals = {
  recentMatchGapTermIds: [], missingCurriculumIds: [],
  missingCertificationIds: [], missingLanguageIds: [],
  missingGradeBandIds: [], insufficientExperience: false, locationMismatchCount: 0,
};

function mi(o: Partial<GapEngineInput> = {}): GapEngineInput {
  return {
    teacherId: "t-test",
    profileGapSignals: o.profileGapSignals ?? { ...ep },
    qualificationGapSignals: o.qualificationGapSignals ?? { ...eq },
    trustGapSignals: o.trustGapSignals ?? { ...et },
    trainingGapSignals: o.trainingGapSignals ?? { ...etr },
    hiringGapSignals: o.hiringGapSignals ?? { ...eh },
    matchGapSignals: o.matchGapSignals ?? { ...em },
    metadata: { triggeredByEvent: "test", triggeredAt: "2026-03-01T00:00:00Z" },
  };
}

describe("Gap Engine — Incomplete profile, no certs", () => {
  it("detects profile and certification gaps", () => {
    const r = runGapEngine(mi({
      profileGapSignals: { ...ep, missingBio: true, missingAvatar: true, missingSubjectMappings: true, missingCurriculumMappings: true, missingExperienceEntries: true, missingEducationEntries: true, missingLanguageEntries: true, missingContactEmail: true, missingCvUrl: true, missingLocation: true, profileCompletenessScore: 17 },
      qualificationGapSignals: { ...eq, certificationIds: [], licenseIds: [] },
    }));
    expect(r.totalGaps).toBeGreaterThan(0);
    expect(r.gapItems.filter(g => g.gapType === "profile_gap").length).toBeGreaterThanOrEqual(9);
    expect(r.gapItems.filter(g => g.gapType === "certification_gap").length).toBeGreaterThanOrEqual(1);
    expect(r.reasonCodes.some(c => c.code === "profile_incomplete")).toBe(true);
  });
});

describe("Gap Engine — Repeated cert rejection", () => {
  it("critical severity with match+job evidence", () => {
    const r = runGapEngine(mi({
      qualificationGapSignals: { ...eq, missingRequiredCertificationIds: ["cm1"] },
      matchGapSignals: { ...em, missingCertificationIds: ["cm1"] },
      hiringGapSignals: { ...eh, totalApplications: 5, totalRejections: 4 },
    }));
    const p = r.gapItems.find(g => g.taxonomyTermId === "cm1");
    expect(p).toBeDefined();
    expect(p!.severity).toBe("critical");
    expect(p!.evidenceSources.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Gap Engine — Missing verification", () => {
  it("detects only trust gaps", () => {
    const r = runGapEngine(mi({
      trustGapSignals: { identityVerified: false, educationVerified: true, experienceVerified: false, credentialVerified: true, missingVerificationTypes: ["identity", "experience"] },
    }));
    expect(r.gapItems.filter(g => g.gapType === "verification_gap").length).toBe(2);
    expect(r.gapItems.filter(g => g.gapType === "profile_gap").length).toBe(0);
  });
});

describe("Gap Engine — No hiring = no false gap", () => {
  it("zero employability gaps", () => {
    expect(runGapEngine(mi()).gapItems.filter(g => g.gapType === "employability_signal_gap").length).toBe(0);
  });
});

describe("Gap Engine — Curriculum mismatch", () => {
  it("creates gaps from match signals", () => {
    const r = runGapEngine(mi({ matchGapSignals: { ...em, missingCurriculumIds: ["c1", "c2"] } }));
    expect(r.gapItems.filter(g => g.gapType === "curriculum_gap").length).toBe(2);
  });
});

describe("Gap Engine — Multi evidence confidence", () => {
  it("increases confidence", () => {
    const s = runGapEngine(mi({ qualificationGapSignals: { ...eq, missingRequiredCertificationIds: ["cx"] } }));
    expect(s.gapItems.find(g => g.taxonomyTermId === "cx")!.confidence).toBe("low");
    const m = runGapEngine(mi({
      qualificationGapSignals: { ...eq, missingRequiredCertificationIds: ["cx"] },
      matchGapSignals: { ...em, missingCertificationIds: ["cx"] },
    }));
    expect(m.gapItems.find(g => g.taxonomyTermId === "cx")!.confidence).toBe("medium");
  });
});

describe("Gap Engine — Structured evidence", () => {
  it("all gaps have evidence", () => {
    const r = runGapEngine(mi({
      profileGapSignals: { ...ep, missingBio: true },
      trustGapSignals: { ...et, identityVerified: false, missingVerificationTypes: ["identity"] },
      trainingGapSignals: { ...etr, hasNoTraining: true, completedCourseCount: 0 },
    }));
    for (const g of r.gapItems) {
      expect(g.evidenceSources.length).toBeGreaterThanOrEqual(1);
      expect(g.relatedSignals.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("Gap Engine — Output shape", () => {
  it("correct structure and freshness", () => {
    const r = runGapEngine(mi());
    expect(r.freshness.isStale).toBe(false);
    expect(r.freshness.freshnessStatus).toBe("fresh");
    expect(Array.isArray(r.gapItems)).toBe(true);
    expect(Array.isArray(r.priorityGapIds)).toBe(true);
  });
});

describe("Gap Engine — Priority ordering", () => {
  it("critical before low", () => {
    const r = runGapEngine(mi({
      profileGapSignals: { ...ep, missingBio: true },
      qualificationGapSignals: { ...eq, missingRequiredCertificationIds: ["ca"] },
      matchGapSignals: { ...em, missingCertificationIds: ["ca"] },
      trustGapSignals: { ...et, identityVerified: false, missingVerificationTypes: ["identity"] },
    }));
    const sv: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    expect(sv[r.gapItems[0].severity]).toBeGreaterThanOrEqual(sv[r.gapItems[r.gapItems.length - 1].severity]);
  });
});

describe("Gap Engine — Grouped summary", () => {
  it("groups by category", () => {
    const r = runGapEngine(mi({ profileGapSignals: { ...ep, missingBio: true, missingAvatar: true } }));
    expect(r.groupedGapSummary.find(g => g.category === "profile_gap")!.count).toBe(2);
  });
});

describe("Gap Engine — Weak rejection", () => {
  it("low-confidence signal", () => {
    const r = runGapEngine(mi({
      hiringGapSignals: { totalApplications: 3, totalRejections: 1, totalShortlists: 1, totalInterviews: 1, rejectionReasonIds: [] },
    }));
    const g = r.gapItems.filter(g => g.gapType === "employability_signal_gap");
    expect(g.length).toBe(1);
    expect(g[0].confidence).toBe("low");
  });
});

// ── Pipeline Integration (6D) ─────────────────────────────────

function toRow(result: ReturnType<typeof runGapEngine>, jobId?: string | null) {
  return {
    teacher_id: result.teacherId, job_id: jobId ?? null, total_gaps: result.totalGaps,
    gaps: JSON.parse(JSON.stringify(result.gapItems.map(g => ({
      gapId: g.gapId, gapType: g.gapType, label: g.label,
      severity: g.severity, confidence: g.confidence,
      evidenceSources: g.evidenceSources, relatedSignals: g.relatedSignals,
      taxonomyTermId: g.taxonomyTermId ?? null,
    })))),
    staleness: "fresh", engine_version: "gap-v1", computed_at: result.computedAt,
  };
}

describe("Gap Pipeline — Snapshot mapping", () => {
  it("maps to DB row", () => {
    const r = runGapEngine(mi({ profileGapSignals: { ...ep, missingBio: true } }));
    const row = toRow(r, null);
    expect(row.teacher_id).toBe("t-test");
    expect(row.job_id).toBeNull();
    expect(row.total_gaps).toBe(r.totalGaps);
    expect(row.gaps.length).toBe(r.totalGaps);
  });

  it("preserves severity/confidence", () => {
    const r = runGapEngine(mi({
      qualificationGapSignals: { ...eq, certificationIds: [], licenseIds: [], missingRequiredCertificationIds: ["cx"] },
      matchGapSignals: { ...em, missingCertificationIds: ["cx"] },
    }));
    const row = toRow(r);
    const rg = (row.gaps as any[]).find((g: any) => g.taxonomyTermId === "cx");
    const eg = r.gapItems.find(g => g.taxonomyTermId === "cx");
    expect(rg.severity).toBe(eg!.severity);
    expect(rg.confidence).toBe(eg!.confidence);
  });

  it("jobId flows through", () => {
    expect(toRow(runGapEngine(mi()), "j1").job_id).toBe("j1");
    expect(toRow(runGapEngine(mi())).job_id).toBeNull();
  });
});

describe("Gap Pipeline — Handler", () => {
  it("correct intent name", async () => {
    const m = await import("@/intelligence/handlers/gaps/gap-refresh.handler");
    expect(m.gapRefreshHandler.intentName).toBe("intent.skill_gap_refresh_requested");
    expect(typeof m.gapRefreshHandler.handle).toBe("function");
  });
});
