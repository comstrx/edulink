/**
 * Inspection Debug Utility — Sprint 5.5
 *
 * Human-readable console output for trace inspection.
 * Internal debugging only — not exposed to end users.
 */

import { buildInspectionRecord } from "./inspection.builder";
import type { ExplainabilityMeta } from "../explainability.types";

export interface PrintInspectionOptions {
  traceId: string;
  decision?: unknown;
  explainability?: ExplainabilityMeta;
}

/**
 * Print a formatted inspection report to console.
 */
export function printInspection(options: PrintInspectionOptions): void {
  const record = buildInspectionRecord(options);

  const lines: string[] = [
    `\n══════ TRACE INSPECTION ══════`,
    `TRACE: ${record.traceId}`,
    ``,
    `STAGES: ${record.summary.stageFlow.join(" → ") || "(none)"}`,
    `ENGINES: ${record.summary.engineFlow.join(", ") || "(none)"}`,
    ``,
    `SUMMARY:`,
    `  decisionType: ${record.summary.decisionType ?? "(unknown)"}`,
    `  outcome: ${record.summary.outcome ?? "(unknown)"}`,
    `  events: ${record.telemetry.length}`,
  ];

  if (record.explainabilityView) {
    lines.push(
      ``,
      `EXPLAINABILITY:`,
      `  shortReason: ${record.explainabilityView.user.shortReason}`,
    );
    const signals = record.explainabilityView.user.signals;
    if (signals.length > 0) {
      lines.push(`  signals:`);
      for (const s of signals) {
        lines.push(`    - ${s.label}: ${s.value ?? "—"}`);
      }
    }
  }

  lines.push(`══════════════════════════════\n`);

  console.log(lines.join("\n"));
}
