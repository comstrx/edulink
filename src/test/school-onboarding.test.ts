import { describe, it, expect } from "vitest";
import {
  isSchoolProfileCompleted,
  getMissingSchoolProfileFields,
} from "@/lib/school-onboarding";

describe("isSchoolProfileCompleted", () => {
  it("returns false for null/undefined", () => {
    expect(isSchoolProfileCompleted(null)).toBe(false);
    expect(isSchoolProfileCompleted(undefined)).toBe(false);
  });

  it("returns false when only onboarding_completed flag is true but required fields missing", () => {
    // Flag alone is insufficient — required fields must be present
    expect(isSchoolProfileCompleted({ onboarding_completed: true })).toBe(false);
  });

  it("returns false when flag is false and fields missing", () => {
    expect(isSchoolProfileCompleted({ onboarding_completed: false })).toBe(false);
  });

  it("returns true when all required fields present (no flag)", () => {
    expect(
      isSchoolProfileCompleted({
        name: "Test School",
        country_term_id: "uuid-1",
        school_type_term_id: "uuid-2",
        curriculum_term_ids: ["uuid-3"],
      })
    ).toBe(true);
  });

  it("returns false when name is empty string", () => {
    expect(
      isSchoolProfileCompleted({
        name: "  ",
        country_term_id: "uuid-1",
        school_type_term_id: "uuid-2",
        curriculum_term_ids: ["uuid-3"],
      })
    ).toBe(false);
  });

  it("returns false when curriculum_term_ids is empty array", () => {
    expect(
      isSchoolProfileCompleted({
        name: "School",
        country_term_id: "uuid-1",
        school_type_term_id: "uuid-2",
        curriculum_term_ids: [],
      })
    ).toBe(false);
  });
});

describe("getMissingSchoolProfileFields", () => {
  it("returns all fields for null profile", () => {
    expect(getMissingSchoolProfileFields(null)).toEqual([
      "name",
      "country",
      "school_type",
      "curricula",
    ]);
  });

  it("returns empty array when all fields present", () => {
    expect(
      getMissingSchoolProfileFields({
        name: "School",
        country_term_id: "uuid-1",
        school_type_term_id: "uuid-2",
        curriculum_term_ids: ["uuid-3"],
      })
    ).toEqual([]);
  });

  it("returns only missing fields", () => {
    expect(
      getMissingSchoolProfileFields({
        name: "School",
        country_term_id: null,
        school_type_term_id: "uuid-2",
        curriculum_term_ids: [],
      })
    ).toEqual(["country", "curricula"]);
  });
});
