/**
 * Inspection Types — Sprint 5.5
 *
 * Contracts for internal observability inspection records.
 * JSON-safe, no functions, no circular references.
 */

import type { ExplainabilityMeta } from "../explainability.types";
import type { ExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import type { TelemetryEvent } from "../telemetry.types";

export interface InspectionSummary {
  decisionType?: string;
  outcome?: string;
  engineFlow: string[];
  stageFlow: string[];
}

export interface InspectionRecord {
  traceId: string;
  decision?: unknown;
  explainability?: ExplainabilityMeta;
  explainabilityView?: ExplainabilityView;
  telemetry: TelemetryEvent[];
  summary: InspectionSummary;
}
