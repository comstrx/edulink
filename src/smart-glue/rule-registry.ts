/**
 * Smart Glue — Rule Registry
 *
 * Central registry of all glue rules. Provides:
 *   - getAllRules()        → full list for inspection
 *   - getRulesForEvent()   → rules triggered by a specific event
 *   - registerRule()       → add a rule at runtime (e.g. from plugins)
 *
 * Does NOT wire to the event bus — that's the executor's job (Phase 3B+).
 * No scoring logic lives here.
 *
 * Phase 3A — Smart Glue Rules Layer
 */

import type { GlueRule } from "./types";
import type { EventPayloadMap } from "@/contracts/core/event-map";

import { hiringRules } from "./rules/hiring-rules";
import { trainingRules } from "./rules/training-rules";
import { trustRules } from "./rules/trust-rules";
import { identityRules } from "./rules/identity-rules";
import { intelligenceRules } from "./rules/intelligence-rules";
import { talentRules } from "./rules/talent-rules";
import { growthRules } from "./rules/growth-rules";
import { careerPathRules } from "./rules/career-path-rules";
import { reputationRules } from "./rules/reputation-rules";
import { mobilityRules } from "./rules/mobility-rules";
import { workforceRules } from "./rules/workforce-rules";
import { mentorshipRules } from "./rules/mentorship-rules";
import { adminRules } from "./rules/admin-rules";

// ── Internal store ──────────────────────────────────────────────

const rules: GlueRule[] = [
  ...hiringRules,
  ...trainingRules,
  ...trustRules,
  ...identityRules,
  ...intelligenceRules,
  ...talentRules,
  ...growthRules,
  ...careerPathRules,
  ...reputationRules,
  ...mobilityRules,
  ...workforceRules,
  ...mentorshipRules,
  ...adminRules,
];

// ── Public API ──────────────────────────────────────────────────

/** Get all registered rules */
export function getAllRules(): ReadonlyArray<GlueRule> {
  return rules;
}

/** Get rules triggered by a specific event name */
export function getRulesForEvent<K extends keyof EventPayloadMap & string>(
  eventName: K,
): GlueRule<K>[] {
  return rules.filter((r) => r.trigger === eventName) as GlueRule<K>[];
}

/** Register a new rule at runtime */
export function registerRule<K extends keyof EventPayloadMap & string>(
  rule: GlueRule<K>,
): void {
  rules.push(rule);
}

/** Get count of rules per trigger event (useful for diagnostics) */
export function getRuleSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const rule of rules) {
    summary[rule.trigger] = (summary[rule.trigger] ?? 0) + 1;
  }
  return summary;
}
