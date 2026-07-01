/**
 * Explainability Layer — Shared Types
 * Sprint 8H-B
 */

export type ExplanationLevel = "positive" | "neutral" | "warning";

export interface ExplanationItem {
  key: string;
  label: string;
  value: number;
  maxValue?: number;
  level: ExplanationLevel;
  message: string;
  improvementHint?: string;
}

export interface ExplainedScore {
  score: number;
  items: ExplanationItem[];
  summary: string;
}
