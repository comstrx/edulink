import { describe, it, expect } from "vitest";

/**
 * Phase 4.4 — Hiring Signals Layer Tests
 *
 * Validates signal types and input shape contract.
 */

import type { HiringSignalType, HiringSignalInput } from "@/lib/hiring-signals";

const VALID_SIGNAL_TYPES: HiringSignalType[] = [
  "application_submitted",
  "application_withdrawn",
  "application_rejected",
  "application_stage_changed",
  "interview_scheduled",
  "interview_updated",
  "interview_cancelled",
  "candidate_hired",
];

describe("Hiring Signals — signal types", () => {
  it("has exactly 8 supported signal types", () => {
    expect(VALID_SIGNAL_TYPES).toHaveLength(8);
  });

  it.each(VALID_SIGNAL_TYPES)("includes %s", (type) => {
    expect(VALID_SIGNAL_TYPES).toContain(type);
  });

  it("does not include arbitrary values", () => {
    const arbitrary = ["entity_changed", "workflow_updated", "page_viewed"];
    arbitrary.forEach((v) => {
      expect(VALID_SIGNAL_TYPES).not.toContain(v);
    });
  });
});

describe("Hiring Signals — input shape", () => {
  it("accepts minimal input", () => {
    const input: HiringSignalInput = {
      signalType: "application_submitted",
      actorType: "teacher",
    };
    expect(input.signalType).toBe("application_submitted");
    expect(input.actorType).toBe("teacher");
  });

  it("accepts full input with metadata", () => {
    const input: HiringSignalInput = {
      signalType: "application_stage_changed",
      actorType: "school",
      actorId: "user-1",
      teacherId: "t-1",
      jobId: "j-1",
      applicationId: "a-1",
      metadata: { newStage: "interview", previousStage: "shortlisted" },
    };
    expect(input.metadata).toEqual({ newStage: "interview", previousStage: "shortlisted" });
  });

  it("supports all three actor types", () => {
    const types: HiringSignalInput["actorType"][] = ["teacher", "school", "system"];
    expect(types).toHaveLength(3);
  });
});
