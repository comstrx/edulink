/**
 * Explanation Helpers
 *
 * Shared utilities for explanation adapters.
 * Phase 4.3 — Explainability Layer
 */

import type { EvidencePoint } from "../types/explanation.types";

/** Max evidence points per explanation to prevent overload */
const MAX_EVIDENCE = 5;

/** Clamp evidence points to a readable maximum */
export function clampEvidence(points: EvidencePoint[]): EvidencePoint[] {
  return points.slice(0, MAX_EVIDENCE);
}

/** Convert snake_case to Title Case */
export function formatCode(code: string): string {
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
