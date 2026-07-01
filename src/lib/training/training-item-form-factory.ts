import { z } from "zod";
import { courseFieldsSchema, emptyCourseForm, type CourseFormValues } from "./course-form-schema";
import { packageFieldsSchema, emptyPackageForm, type PackageFormValues } from "./package-form-schema";
import { pathwayFieldsSchema, emptyPathwayForm, type PathwayFormValues } from "./pathway-form-schema";

/**
 * Unified training item form schema factory.
 * Returns the correct Zod schema and defaults based on item type.
 *
 * Phase 5.3 — Multi-type editor support (course, package, pathway)
 */

export type TrainingItemType = "course" | "package" | "pathway";

export type TrainingItemFormValues = CourseFormValues | PackageFormValues | PathwayFormValues;

export function getSchemaForType(type: TrainingItemType) {
  switch (type) {
    case "package":
      return packageFieldsSchema;
    case "pathway":
      return pathwayFieldsSchema;
    case "course":
    default:
      return courseFieldsSchema;
  }
}

export function getDefaultsForType(type: TrainingItemType): TrainingItemFormValues {
  switch (type) {
    case "package":
      return emptyPackageForm;
    case "pathway":
      return emptyPathwayForm;
    case "course":
    default:
      return emptyCourseForm;
  }
}
