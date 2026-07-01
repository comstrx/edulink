/**
 * Training Item Capability Contract
 *
 * Centralized mapping that defines what each training item type
 * is allowed to do across the platform. This is the single source
 * of truth for boundary enforcement in application code.
 *
 * Runtime validation in the database mirrors these rules via triggers.
 */

import type { TrainingItemType } from "./training-item-types";

// ── Extended type that includes library/resource items ──

export type TrainingItemTypeExtended =
  | TrainingItemType        // "course" | "package" | "pathway"
  | "library"
  | "resource"
  | "guide"
  | "template"
  | "toolkit";

// ── Capability flags ──

export interface TrainingItemCapabilities {
  /** Can be assigned to a teacher by a school */
  is_assignable: boolean;
  /** Can enter the training execution runtime */
  is_executable: boolean;
  /** May be eligible for certificate/credential issuance */
  is_certifiable: boolean;
  /** Is a library/discovery-only resource (no runtime) */
  is_library_resource: boolean;
  /** Is a commercial wrapper that bundles other items */
  is_commercial_wrapper: boolean;
}

// ── Canonical capability map ──

const CAPABILITY_MAP: Record<TrainingItemTypeExtended, TrainingItemCapabilities> = {
  course: {
    is_assignable: true,
    is_executable: true,
    is_certifiable: true,
    is_library_resource: false,
    is_commercial_wrapper: false,
  },
  pathway: {
    is_assignable: true,
    is_executable: true,
    is_certifiable: true,
    is_library_resource: false,
    is_commercial_wrapper: false,
  },
  package: {
    is_assignable: false,
    is_executable: false,
    is_certifiable: false,
    is_library_resource: false,
    is_commercial_wrapper: true,
  },
  library: {
    is_assignable: false,
    is_executable: false,
    is_certifiable: false,
    is_library_resource: true,
    is_commercial_wrapper: false,
  },
  resource: {
    is_assignable: false,
    is_executable: false,
    is_certifiable: false,
    is_library_resource: true,
    is_commercial_wrapper: false,
  },
  guide: {
    is_assignable: false,
    is_executable: false,
    is_certifiable: false,
    is_library_resource: true,
    is_commercial_wrapper: false,
  },
  template: {
    is_assignable: false,
    is_executable: false,
    is_certifiable: false,
    is_library_resource: true,
    is_commercial_wrapper: false,
  },
  toolkit: {
    is_assignable: false,
    is_executable: false,
    is_certifiable: false,
    is_library_resource: true,
    is_commercial_wrapper: false,
  },
};

// ── Public API ──

/** Get capabilities for a training item type. Unknown types default to library-like (no runtime). */
export function getCapabilities(type: string): TrainingItemCapabilities {
  return (
    CAPABILITY_MAP[type as TrainingItemTypeExtended] ?? {
      is_assignable: false,
      is_executable: false,
      is_certifiable: false,
      is_library_resource: true,
      is_commercial_wrapper: false,
    }
  );
}

/** Check if a type can be assigned to teachers */
export function isAssignable(type: string): boolean {
  return getCapabilities(type).is_assignable;
}

/** Check if a type can enter training execution runtime */
export function isExecutable(type: string): boolean {
  return getCapabilities(type).is_executable;
}

/** Check if a type may produce credentials */
export function isCertifiable(type: string): boolean {
  return getCapabilities(type).is_certifiable;
}

/** Check if a type is a library/discovery-only resource */
export function isLibraryResource(type: string): boolean {
  return getCapabilities(type).is_library_resource;
}

// ── Convenience sets for use in filters/queries ──

/** Types allowed in training_assignments */
export const ASSIGNABLE_TYPES: readonly string[] = ["course", "pathway"];

/** Types allowed in training_executions */
export const EXECUTABLE_TYPES: readonly string[] = ["course", "pathway"];

/** Types that are library/resource discovery only */
export const LIBRARY_RESOURCE_TYPES: readonly string[] = [
  "library",
  "resource",
  "guide",
  "template",
  "toolkit",
];

/** All recognized training item types */
export const ALL_TRAINING_ITEM_TYPES: readonly string[] = [
  "course",
  "package",
  "pathway",
  ...LIBRARY_RESOURCE_TYPES,
];
