/**
 * Canonical Readiness — Barrel Export
 *
 * Single Source of Truth for readiness across the platform.
 */

export type { CanonicalReadinessLevel } from "./canonical-readiness.types";
export {
  CANONICAL_READINESS_LABELS,
  CANONICAL_READINESS_STYLES,
  isCanonicalReadinessLevel,
} from "./canonical-readiness.types";

export type { CanonicalReadinessResult } from "./useCanonicalReadiness";
export { useCanonicalReadiness } from "./useCanonicalReadiness";
