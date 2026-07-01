/**
 * Inspection Builder — Sprint 5.5
 *
 * Builds InspectionRecord from existing telemetry + explainability.
 * Pure aggregation — no new logic, no inference.
 */

import type { ExplainabilityMeta } from "../explainability.types";
import type { ExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { buildExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { collectTrace } from "./trace-collector";
import type { InspectionRecord } from "./inspection.types";

export interface BuildInspectionOptions {
  traceId: string;
  decision?: unknown;
  explainability?: ExplainabilityMeta;
}

/**
 * Build a full inspection record for a given traceId.
 */
export function buildInspectionRecord(
  options: BuildInspectionOptions,
): InspectionRecord {
  const { traceId, decision, explainability } = options;

  const telemetry = collectTrace(traceId);

  // Extract unique engine flow preserving first-seen order
  const engineFlow: string[] = [];
  const seenEngines = new Set<string>();
  for (const evt of telemetry) {
    if (!seenEngines.has(evt.engine)) {
      seenEngines.add(evt.engine);
      engineFlow.push(evt.engine);
    }
  }

  // Extract ordered stage flow preserving first-seen order
  const stageFlow: string[] = [];
  const seenStages = new Set<string>();
  for (const evt of telemetry) {
    if (!seenStages.has(evt.stage)) {
      seenStages.add(evt.stage);
      stageFlow.push(evt.stage);
    }
  }

  // Derive summary from last telemetry event
  const lastEvent = telemetry[telemetry.length - 1];

  let explainabilityView: ExplainabilityView | undefined;
  if (explainability) {
    explainabilityView = buildExplainabilityView(explainability);
  }

  return {
    traceId,
    decision,
    explainability,
    explainabilityView,
    telemetry,
    summary: {
      decisionType: lastEvent?.decisionType,
      outcome: lastEvent?.outcome,
      engineFlow,
      stageFlow,
    },
  };
}
