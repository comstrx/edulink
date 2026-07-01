/**
 * Decision Logger — Sprint 5.3
 *
 * Unified structured telemetry emitter for intelligence decisions.
 * Produces TelemetryEvent payloads via console.log("[IntelDecision]").
 *
 * Console-only — no persistence.
 */

import type { ExplainabilityMeta } from "./explainability.types";
import type { TelemetryEvent, TelemetryStage, TelemetryEngine, TelemetryOutcome } from "./telemetry.types";
import { pushTelemetryEvent } from "./inspection/trace-collector";

export type DecisionType =
  | "rejection"
  | "profile_update"
  | "training_completion"
  | "evidence_approval"
  | "cross_domain"
  | "feedback_overlay"
  | "provider_overlay"
  | "safety_pipeline"
  | "school_hiring_health"
  | "job_publish"
  | "verification"
  | "team_capability"
  | "multi_event"
  | "contextual_priority"
  | "recommendation_targeting"
  | "cross_domain_modifier"
  | "provider_selection"
  | "acceptance"
  | "interview";

export interface DecisionLogEntry {
  traceId: string;
  decisionType: DecisionType;
  entityId?: string;
  eventName?: string;
  explainability?: ExplainabilityMeta;
  metadata?: Record<string, unknown>;
}

// ── Stage / Engine mapping ────────────────────────────────────

const DECISION_TO_STAGE: Record<string, TelemetryStage> = {
  rejection: "decision",
  profile_update: "decision",
  training_completion: "decision",
  evidence_approval: "decision",
  cross_domain: "decision",
  feedback_overlay: "feedback",
  provider_overlay: "provider",
  safety_pipeline: "safety",
  school_hiring_health: "decision",
  job_publish: "decision",
  verification: "decision",
  team_capability: "decision",
  multi_event: "rule",
  contextual_priority: "decision",
  recommendation_targeting: "selection",
  cross_domain_modifier: "overlay",
  provider_selection: "selection",
};

const DECISION_TO_ENGINE: Record<string, TelemetryEngine> = {
  rejection: "decision-engine",
  profile_update: "decision-engine",
  training_completion: "decision-engine",
  evidence_approval: "decision-engine",
  cross_domain: "cross-domain",
  feedback_overlay: "feedback-system",
  provider_overlay: "provider-intelligence",
  safety_pipeline: "safety-pipeline",
  school_hiring_health: "decision-engine",
  job_publish: "decision-engine",
  verification: "decision-engine",
  team_capability: "decision-engine",
  multi_event: "dispatcher",
  contextual_priority: "decision-engine",
  recommendation_targeting: "decision-engine",
  cross_domain_modifier: "cross-domain",
  provider_selection: "provider-intelligence",
};

/**
 * Derive outcome from metadata signals.
 * Maps existing conditions — no new logic.
 */
function deriveOutcome(entry: DecisionLogEntry): TelemetryOutcome | undefined {
  const meta = entry.metadata;
  if (!meta) return undefined;

  // Safety pipeline: check final count
  if (entry.decisionType === "safety_pipeline") {
    const final = meta.final as number | undefined;
    return final === 0 ? "blocked" : "applied";
  }

  // Explicit skip/no-op signals
  if (meta.action === "skip" || meta.scenario === "none") return "skipped";
  if (meta.applied === false) return "no-op";

  // Provider overlay
  if (entry.decisionType === "provider_overlay") {
    const impact = meta.decisionImpact as string | undefined;
    if (impact === "ignore") return "no-op";
    if (impact === "suppress") return "blocked";
    return "applied";
  }

  return undefined;
}

/**
 * Log a structured telemetry event.
 * Single entry point for all decision observability.
 */
export function logDecisionTrace(entry: DecisionLogEntry): void {
  const stage = DECISION_TO_STAGE[entry.decisionType] ?? "output";
  const engine = DECISION_TO_ENGINE[entry.decisionType] ?? "decision-engine";
  const outcome = deriveOutcome(entry);

  const telemetry: TelemetryEvent = {
    traceId: entry.traceId,
    timestamp: Date.now(),
    engine,
    stage,
    decisionType: entry.decisionType,
    outcome,
    metadata: {
      entity: entry.entityId ?? null,
      event: entry.eventName ?? null,
      stageCount: entry.explainability?.stages.length ?? 0,
      summary: entry.explainability?.summary ?? null,
      ...(entry.metadata ?? {}),
    },
  };

  pushTelemetryEvent(telemetry);
  console.log("[IntelDecision]", JSON.stringify(telemetry));
}
