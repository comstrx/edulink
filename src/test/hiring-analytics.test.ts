import { describe, it, expect } from "vitest";

/**
 * Phase 4.5 — Hiring Analytics Foundation Tests
 *
 * Validates metric computation logic.
 */

describe("Hiring Analytics — metric computation", () => {
  const compute = (counts: Record<string, number>) => {
    const apps = counts["application_submitted"] ?? 0;
    const interviews = counts["interview_scheduled"] ?? 0;
    const hires = counts["candidate_hired"] ?? 0;
    return {
      applicationsCount: apps,
      interviewsCount: interviews,
      hiresCount: hires,
      interviewRate: apps > 0 ? interviews / apps : 0,
      hireRate: apps > 0 ? hires / apps : 0,
    };
  };

  it("computes correct counts", () => {
    const m = compute({ application_submitted: 10, interview_scheduled: 4, candidate_hired: 2 });
    expect(m.applicationsCount).toBe(10);
    expect(m.interviewsCount).toBe(4);
    expect(m.hiresCount).toBe(2);
  });

  it("computes interview rate", () => {
    const m = compute({ application_submitted: 20, interview_scheduled: 5 });
    expect(m.interviewRate).toBe(0.25);
  });

  it("computes hire rate", () => {
    const m = compute({ application_submitted: 10, candidate_hired: 3 });
    expect(m.hireRate).toBe(0.3);
  });

  it("handles zero applications without division error", () => {
    const m = compute({});
    expect(m.interviewRate).toBe(0);
    expect(m.hireRate).toBe(0);
    expect(m.applicationsCount).toBe(0);
  });

  it("handles missing signal types gracefully", () => {
    const m = compute({ application_submitted: 5 });
    expect(m.interviewsCount).toBe(0);
    expect(m.hiresCount).toBe(0);
    expect(m.interviewRate).toBe(0);
    expect(m.hireRate).toBe(0);
  });
});
