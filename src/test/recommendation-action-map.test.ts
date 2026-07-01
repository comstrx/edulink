import { describe, it, expect } from "vitest";
import { resolveActionMapEntry, buildActionPath } from "@/actions/recommendation-action.map";

describe("recommendation-action.map — growth action types", () => {
  const growthTypes = [
    { type: "enroll_course",             expectAction: "open_course",        expectCta: "View Course",        expectDeep: "/training/courses/abc" },
    { type: "complete_missing_course",   expectAction: "open_course",        expectCta: "View Course",        expectDeep: "/training/courses/abc" },
    { type: "start_pathway",             expectAction: "open_pathway",       expectCta: "Start Pathway",      expectDeep: "/training/pathways/abc" },
    { type: "continue_pathway",          expectAction: "open_pathway",       expectCta: "Continue Pathway",   expectDeep: "/training/pathways/abc" },
    { type: "pursue_credential",         expectAction: "upload_certificate", expectCta: "Pursue Credential",  expectDeep: "/app/teacher/credentials?highlight=abc" },
    { type: "submit_evidence",           expectAction: "open_credentials",   expectCta: "Submit Evidence",    expectDeep: "/app/teacher/credentials" },
    { type: "revise_evidence",           expectAction: "open_credentials",   expectCta: "Revise Evidence",    expectDeep: "/app/teacher/credentials" },
    { type: "request_mentor_validation", expectAction: "book_mentor",        expectCta: "Request Validation", expectDeep: "/training/mentors/abc" },
  ];

  for (const { type, expectAction, expectCta, expectDeep } of growthTypes) {
    it(`${type} → ${expectAction}`, () => {
      const entry = resolveActionMapEntry(type);
      expect(entry.actionType).toBe(expectAction);
      expect(entry.ctaLabel).toBe(expectCta);
      const path = buildActionPath(entry, "abc");
      expect(path).toBe(expectDeep);
    });
  }

  it("unknown type still falls back to unsupported_action", () => {
    const entry = resolveActionMapEntry("totally_unknown_type");
    expect(entry.actionType).toBe("unsupported_action");
  });

  it("snapshot types remain unchanged", () => {
    expect(resolveActionMapEntry("course_recommendation").actionType).toBe("open_course");
    expect(resolveActionMapEntry("pathway_recommendation").actionType).toBe("open_pathway");
    expect(resolveActionMapEntry("certification_recommendation").actionType).toBe("upload_certificate");
  });

  it("routes to basePath when targetId is absent", () => {
    const entry = resolveActionMapEntry("enroll_course");
    expect(buildActionPath(entry, undefined)).toBe("/training");
  });
});
