/**
 * Explainability Builder — Sprint 5
 *
 * Aggregates reasoning from pipeline stages into an ExplainabilityMeta.
 * Pure function — no logic inference, only aggregation.
 */

import type { ExplainabilityMeta, StageReasoning } from "./explainability.types";

export interface StageInput {
  stage: string;
  reasoning: string | string[];
}

export interface BuildExplainabilityOptions {
  traceId: string;
  stages: StageInput[];
  summary?: string;
}

/**
 * Build an ExplainabilityMeta from pipeline stage inputs.
 *
 * - Accepts reasoning as string OR string[]
 * - Normalizes all into string[]
 * - Preserves original order
 * - Generates summary from stages if not provided
 */
export function buildExplainabilityTrace(
  options: BuildExplainabilityOptions,
): ExplainabilityMeta {
  const stages: StageReasoning[] = options.stages.map((s) => ({
    stage: s.stage,
    reasoning: normalizeReasoning(s.reasoning),
  }));

  const summary =
    options.summary ?? buildDefaultSummary(stages);

  return {
    traceId: options.traceId,
    stages,
    summary,
  };
}

function normalizeReasoning(input: string | string[]): string[] {
  if (Array.isArray(input)) return input;
  return input ? [input] : [];
}

function buildDefaultSummary(stages: StageReasoning[]): string {
  const activeStages = stages.filter((s) => s.reasoning.length > 0);
  if (activeStages.length === 0) return "no reasoning captured";
  return `${activeStages.length} stage(s): ${activeStages.map((s) => s.stage).join(" → ")}`;
}
