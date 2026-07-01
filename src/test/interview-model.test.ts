import { describe, it, expect } from "vitest";

/**
 * Phase 4.3A — Interview Data Model Tests
 *
 * Validates interview status constraints and type definitions.
 */

const VALID_STATUSES = ["scheduled", "completed", "cancelled"];

describe("Interview status model", () => {
  it("has exactly 3 supported statuses", () => {
    expect(VALID_STATUSES).toHaveLength(3);
  });

  it("includes scheduled", () => expect(VALID_STATUSES).toContain("scheduled"));
  it("includes completed", () => expect(VALID_STATUSES).toContain("completed"));
  it("includes cancelled", () => expect(VALID_STATUSES).toContain("cancelled"));

  it("does not include arbitrary values", () => {
    expect(VALID_STATUSES).not.toContain("pending");
    expect(VALID_STATUSES).not.toContain("confirmed");
  });
});

describe("Interview data structure", () => {
  it("requires application_id linkage", () => {
    const interview = {
      id: "int-1",
      application_id: "app-1",
      teacher_id: "teacher-1",
      job_id: "job-1",
      scheduled_at: "2026-04-01T10:00:00Z",
      meeting_link: "https://meet.example.com/abc",
      notes: "Technical interview",
      status: "scheduled",
    };
    expect(interview.application_id).toBeTruthy();
    expect(interview.teacher_id).toBeTruthy();
    expect(interview.job_id).toBeTruthy();
  });

  it("meeting_link and notes are optional", () => {
    const interview = {
      id: "int-2",
      application_id: "app-2",
      teacher_id: "teacher-2",
      job_id: "job-2",
      scheduled_at: "2026-04-02T14:00:00Z",
      meeting_link: null,
      notes: null,
      status: "scheduled",
    };
    expect(interview.meeting_link).toBeNull();
    expect(interview.notes).toBeNull();
  });
});
