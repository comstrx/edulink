/**
 * Workforce Explainability Tests — Sprint 4
 */

import { describe, it, expect } from "vitest";
import {
  buildProfileExplainability,
  buildDepartmentExplainability,
  buildGapExplainability,
  buildPromotionExplainability,
  buildWorkforceExplainability,
} from "@/workforce/explainability/workforce-explainability.builder";
import type {
  SchoolWorkforceProfile,
  DepartmentCapability,
  WorkforceGap,
  PromotionReadinessEntry,
  TeacherWorkforceSignals,
} from "@/workforce/types/workforce.types";

const mockProfile: SchoolWorkforceProfile = {
  schoolId: "school-1",
  teacherCount: 5,
  verifiedTeacherCount: 2,
  averageReputationScore: 35,
  averageCriScore: 42,
  credentialCoverage: 40,
  careerStageDistribution: { "Level 1": 3, "Level 2": 2 },
  reputationDistribution: { developing: 3, established: 2 },
  topGaps: [],
  promotionReadyCount: 1,
  workforceUpdatedAt: new Date().toISOString(),
};

const mockTeachers: TeacherWorkforceSignals[] = [
  {
    teacherId: "t1", teacherName: "Alice", subjectTermIds: ["s1"], curriculumTermIds: [],
    reputationScore: 40, reputationTier: "established", criScore: 50, credentialCount: 2,
    verifiedCompletionCount: 1, readinessPercent: 80, nextStageName: "Level 2", gapCount: 0, blockingGaps: [],
  },
  {
    teacherId: "t2", teacherName: "Bob", subjectTermIds: ["s1"], curriculumTermIds: [],
    reputationScore: 30, reputationTier: "developing", criScore: 34, credentialCount: 0,
    verifiedCompletionCount: 0, readinessPercent: 20, gapCount: 3, blockingGaps: [{ key: "k1", label: "Gap" }],
  },
];

describe("Workforce Explainability", () => {
  describe("Profile Explainability", () => {
    it("produces valid summary and signals", () => {
      const result = buildProfileExplainability(mockProfile, mockTeachers);
      expect(result.summary).toContain("5 teachers");
      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.keyDrivers.length).toBeGreaterThan(0);
      expect(result.teamSize).toBe(5);
      expect(result.computedAt).toBeTruthy();
    });

    it("handles empty team", () => {
      const empty = { ...mockProfile, teacherCount: 0 };
      const result = buildProfileExplainability(empty, []);
      expect(result.summary).toContain("empty");
      expect(result.teamSize).toBe(0);
    });
  });

  describe("Department Explainability", () => {
    it("produces valid signals for high gap score", () => {
      const dept: DepartmentCapability = {
        departmentKey: "math", departmentLabel: "Mathematics", teacherCount: 3,
        averageReputationScore: 25, averageCriScore: 30, verifiedCount: 0,
        credentialCoverage: 33, stageDistribution: {}, gapScore: 75,
      };
      const result = buildDepartmentExplainability(dept);
      expect(result.summary).toContain("Mathematics");
      expect(result.keyDrivers[0]).toContain("High capability gap");
      expect(result.signals.length).toBeGreaterThan(0);
    });

    it("reports strong capability for low gap score", () => {
      const dept: DepartmentCapability = {
        departmentKey: "eng", departmentLabel: "English", teacherCount: 4,
        averageReputationScore: 60, averageCriScore: 55, verifiedCount: 3,
        credentialCoverage: 75, stageDistribution: {}, gapScore: 20,
      };
      const result = buildDepartmentExplainability(dept);
      expect(result.keyDrivers[0]).toContain("strong");
    });
  });

  describe("Gap Explainability", () => {
    it("includes trigger condition and signals", () => {
      const gap: WorkforceGap = {
        gapType: "low_credential_coverage", severity: "high",
        description: "Only 20% hold credentials", recommendedIntervention: "Train staff",
      };
      const result = buildGapExplainability(gap, { ...mockProfile, credentialCoverage: 20 });
      expect(result.triggerCondition).toContain("30%");
      expect(result.contributingSignals.length).toBeGreaterThan(0);
      expect(result.contributingSignals[0].type).toBe("credentials");
    });

    it("handles gap type without specific signals gracefully", () => {
      const gap: WorkforceGap = {
        gapType: "curriculum_coverage_gap", severity: "medium",
        description: "Missing coverage",
      };
      const result = buildGapExplainability(gap, mockProfile);
      expect(result.triggerCondition).toBeTruthy();
      expect(result.contributingSignals).toBeDefined();
    });
  });

  describe("Promotion Explainability", () => {
    it("summarizes pipeline correctly", () => {
      const pipeline: PromotionReadinessEntry[] = [
        { teacherId: "t1", readinessPercent: 80, gapCount: 0, blockingGaps: [], nextStage: "L2" },
        { teacherId: "t2", readinessPercent: 30, gapCount: 2, blockingGaps: [{ key: "k", label: "G" }] },
      ];
      const result = buildPromotionExplainability(pipeline, 5);
      expect(result.summary).toContain("2 teachers");
      expect(result.keyDrivers.length).toBeGreaterThan(0);
    });

    it("handles empty pipeline", () => {
      const result = buildPromotionExplainability([], 5);
      expect(result.summary).toContain("No teachers");
    });

    it("handles zero team size", () => {
      const result = buildPromotionExplainability([], 0);
      expect(result.summary).toContain("empty");
    });
  });

  describe("Full Bundle", () => {
    it("produces complete explainability bundle", () => {
      const dept: DepartmentCapability = {
        departmentKey: "s1", departmentLabel: "Science", teacherCount: 2,
        averageReputationScore: 35, averageCriScore: 42, verifiedCount: 1,
        credentialCoverage: 50, stageDistribution: {}, gapScore: 45,
      };
      const gap: WorkforceGap = {
        gapType: "low_verified_evidence", severity: "high",
        description: "Only 20% verified",
      };
      const pipeline: PromotionReadinessEntry[] = [
        { teacherId: "t1", readinessPercent: 80, gapCount: 0, blockingGaps: [] },
      ];

      const bundle = buildWorkforceExplainability(
        { ...mockProfile, topGaps: [gap] }, [dept], [gap], pipeline, mockTeachers,
      );

      expect(bundle.profile.summary).toBeTruthy();
      expect(bundle.departments["s1"]).toBeDefined();
      expect(bundle.gaps.length).toBe(1);
      expect(bundle.promotionPipeline.summary).toBeTruthy();
    });

    it("is deterministic — same input produces same output", () => {
      const profile = { ...mockProfile, workforceUpdatedAt: "2026-01-01T00:00:00Z" };
      const a = buildWorkforceExplainability(profile, [], [], [], mockTeachers);
      const b = buildWorkforceExplainability(profile, [], [], [], mockTeachers);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it("contains no undefined or null in signal values", () => {
      const bundle = buildWorkforceExplainability(mockProfile, [], [], [], mockTeachers);
      for (const sig of bundle.profile.signals) {
        expect(sig.type).toBeTruthy();
        expect(sig.label).toBeTruthy();
        expect(sig.value).toBeDefined();
        expect(sig.value).not.toBeNull();
      }
    });
  });
});
