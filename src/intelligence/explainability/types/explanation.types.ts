/**
 * Explainability Layer — Types
 *
 * Defines structured explanation DTOs that convert intelligence signals
 * into human-readable, audience-appropriate explanations.
 *
 * Phase 4.3 — Explainability and User Trust
 */

import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";

// ── Core explanation structure ─────────────────────────────────

export interface EvidencePoint {
  /** Short label, e.g. "Subject alignment" */
  label: string;
  /** Human-readable detail */
  detail: string;
  /** Positive, negative, or neutral */
  sentiment: "positive" | "negative" | "neutral";
}

export interface ExplanationDTO {
  /** One-line headline summary */
  headline: string;
  /** 1–2 sentence description */
  shortDescription: string;
  /** Up to 5 evidence points */
  evidencePoints: EvidencePoint[];
  /** Optional actionable suggestion for the viewer */
  suggestion?: string | null;
}

// ── Per-signal explanation DTOs ────────────────────────────────

export interface CriExplanationDTO extends ExplanationDTO {
  signal: "cri";
  score: number;
  band: string;
}

export interface MatchExplanationDTO extends ExplanationDTO {
  signal: "match";
  score: number;
  confidence: string;
}

export interface GapExplanationDTO extends ExplanationDTO {
  signal: "gap";
  totalGaps: number;
}

export interface RecommendationExplanationDTO extends ExplanationDTO {
  signal: "recommendation";
  totalCount: number;
}

export interface VerificationExplanationDTO extends ExplanationDTO {
  signal: "verification";
  verifiedCount: number;
  totalCount: number;
  overallStatus: string;
}

// ── Union type ─────────────────────────────────────────────────

export type IntelligenceExplanation =
  | CriExplanationDTO
  | MatchExplanationDTO
  | GapExplanationDTO
  | RecommendationExplanationDTO
  | VerificationExplanationDTO;

// ── Fallback constant ──────────────────────────────────────────

export const FALLBACK_EXPLANATION: ExplanationDTO = {
  headline: "Insights unavailable",
  shortDescription: "Additional information required to generate detailed insights.",
  evidencePoints: [],
  suggestion: null,
};
