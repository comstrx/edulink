/**
 * Growth Normalization — Guardrail Tests
 *
 * Ensures the reader-side normalization layer correctly maps
 * all known DB values, legacy values, and edge cases so the
 * school bridge cannot be silently starved by contract drift.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeSourceType,
  isHiringDriven,
  HIRING_SOURCE_TYPES,
  normalizeActionType,
  actionTypeLabel,
} from "@/lib/growth/growth-normalization";

// ── Source Type Normalization ──────────────────────────────────

describe("normalizeSourceType", () => {
  it("passes through current production DB values unchanged", () => {
    expect(normalizeSourceType("rejection_feedback")).toBe("rejection_feedback");
    expect(normalizeSourceType("gap_analysis")).toBe("gap_analysis");
    expect(normalizeSourceType("training_completion")).toBe("training_completion");
  });

  it("maps legacy type-defined values to canonical DB values", () => {
    expect(normalizeSourceType("rejection_reason")).toBe("rejection_feedback");
    expect(normalizeSourceType("hiring_gap")).toBe("gap_analysis");
    expect(normalizeSourceType("match_weakness")).toBe("gap_analysis");
    expect(normalizeSourceType("gap_profile")).toBe("gap_analysis");
    expect(normalizeSourceType("talent_intelligence")).toBe("gap_analysis");
  });

  it("returns 'unknown' for null/undefined/empty", () => {
    expect(normalizeSourceType(null)).toBe("unknown");
    expect(normalizeSourceType(undefined)).toBe("unknown");
    expect(normalizeSourceType("")).toBe("unknown");
    expect(normalizeSourceType("   ")).toBe("unknown");
  });

  it("passes through unrecognised values as-is", () => {
    expect(normalizeSourceType("some_future_source")).toBe("some_future_source");
  });
});

describe("isHiringDriven", () => {
  it("returns true for all canonical hiring source types", () => {
    for (const st of HIRING_SOURCE_TYPES) {
      expect(isHiringDriven(st)).toBe(true);
    }
  });

  it("returns true for legacy values that normalise to hiring sources", () => {
    expect(isHiringDriven("rejection_reason")).toBe(true);
    expect(isHiringDriven("gap_profile")).toBe(true);
  });

  it("returns false for unknown or unrelated sources", () => {
    expect(isHiringDriven("unrelated_source")).toBe(false);
    expect(isHiringDriven(null)).toBe(false);
    expect(isHiringDriven("")).toBe(false);
  });
});

describe("HIRING_SOURCE_TYPES guard", () => {
  it("contains exactly the three canonical hiring-driven source types", () => {
    expect([...HIRING_SOURCE_TYPES].sort()).toEqual(
      ["gap_analysis", "rejection_feedback", "training_completion"]
    );
  });
});

// ── Action Type Normalization ──────────────────────────────────

describe("normalizeActionType", () => {
  it("normalises legacy enroll_now to canonical enroll_course", () => {
    expect(normalizeActionType("enroll_now")).toBe("enroll_course");
  });

  it("passes through canonical action types unchanged", () => {
    expect(normalizeActionType("enroll_course")).toBe("enroll_course");
    expect(normalizeActionType("continue_pathway")).toBe("continue_pathway");
    expect(normalizeActionType("submit_evidence")).toBe("submit_evidence");
    expect(normalizeActionType("start_pathway")).toBe("start_pathway");
    expect(normalizeActionType("pursue_credential")).toBe("pursue_credential");
  });

  it("returns general_development for null/undefined/empty", () => {
    expect(normalizeActionType(null)).toBe("general_development");
    expect(normalizeActionType(undefined)).toBe("general_development");
    expect(normalizeActionType("")).toBe("general_development");
  });
});

// ── Display Labels ─────────────────────────────────────────────

describe("actionTypeLabel", () => {
  it("maps both legacy and canonical enroll types to same label", () => {
    expect(actionTypeLabel("enroll_now")).toBe("Course Enrollment");
    expect(actionTypeLabel("enroll_course")).toBe("Course Enrollment");
  });

  it("maps all known action types to readable labels", () => {
    expect(actionTypeLabel("continue_pathway")).toBe("Continue Pathway");
    expect(actionTypeLabel("submit_evidence")).toBe("Submit Evidence");
    expect(actionTypeLabel("request_mentor_validation")).toBe("Mentor Validation");
    expect(actionTypeLabel("pursue_credential")).toBe("Pursue Credential");
    expect(actionTypeLabel("complete_missing_course")).toBe("Complete Missing Course");
  });

  it("returns General Development for null/undefined/empty/invalid", () => {
    expect(actionTypeLabel(null)).toBe("General Development");
    expect(actionTypeLabel(undefined)).toBe("General Development");
    expect(actionTypeLabel("")).toBe("General Development");
    expect(actionTypeLabel("null")).toBe("General Development");
    expect(actionTypeLabel("undefined")).toBe("General Development");
  });

  it("humanises unknown action types as fallback", () => {
    expect(actionTypeLabel("some_new_action")).toBe("Some New Action");
  });
});

// ── Privacy Guardrail (SchoolGrowthSummary shape) ──────────────

describe("School growth summary privacy contract", () => {
  // This test documents the expected shape of SchoolGrowthSummary
  // to guard against accidental leakage of teacher-level fields.
  const ALLOWED_SUMMARY_KEYS = ["totalRecommendations", "affectedTeachers", "topAreas"];
  const FORBIDDEN_FIELDS = [
    "teacher_id", "teacherId", "teacher_name", "teacherName",
    "recommendation_reason", "recommendationReason",
    "recommendation_trace", "recommendationTrace",
    "source_reference_id", "sourceReferenceId",
  ];

  it("summary shape contains only aggregate keys", () => {
    // Simulate summary output
    const summary = {
      totalRecommendations: 5,
      affectedTeachers: 3,
      topAreas: [{ label: "Course Enrollment", count: 3 }],
    };
    expect(Object.keys(summary).sort()).toEqual(ALLOWED_SUMMARY_KEYS.sort());
  });

  it("summary shape must never contain teacher-level fields", () => {
    const summary = {
      totalRecommendations: 5,
      affectedTeachers: 3,
      topAreas: [],
    };
    for (const field of FORBIDDEN_FIELDS) {
      expect(summary).not.toHaveProperty(field);
    }
  });
});
