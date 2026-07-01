/**
 * Gap Adapter
 *
 * Converts TeacherGapSnapshot → GapInsightSignal.
 * Pure mapping only — severity and confidence come from the snapshot.
 *
 * ❌ Does NOT derive severity from category
 * ❌ Does NOT generate suggested actions (that's the recommendation engine's job)
 * ✅ Maps persisted gap data to UI-safe signal shape
 *
 * Sprint 2.3 — Gap/Recommendation/Glue Alignment
 */

import type { TeacherGapSnapshot } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { GapInsightSignal } from "./types/adapter-signals.types";

type Severity = "low" | "medium" | "high";

/** Map engine severity to adapter severity (collapse "critical" into "high") */
function normalizeSeverity(s: string | undefined): Severity {
  if (s === "critical" || s === "high") return "high";
  if (s === "low") return "low";
  return "medium";
}

export function adaptGapToSignal(snapshot: TeacherGapSnapshot | null): GapInsightSignal | null {
  if (!snapshot) return null;

  const topGaps = snapshot.gaps.slice(0, 5).map((g) => ({
    termId: g.termId,
    label: g.label ?? g.termId,
    category: g.category,
    severity: normalizeSeverity(g.severity),
  }));

  // Severity distribution from persisted gap data — no re-derivation
  const severityMap = new Map<Severity, number>();
  snapshot.gaps.forEach((g) => {
    const s = normalizeSeverity(g.severity);
    severityMap.set(s, (severityMap.get(s) ?? 0) + 1);
  });
  const severityLevels = Array.from(severityMap.entries()).map(([severity, count]) => ({ severity, count }));

  const evidenceSources = [...new Set(snapshot.gaps.map((g) => g.source))];

  return {
    topGaps,
    severityLevels,
    evidenceSources,
    totalGaps: snapshot.totalGaps,
  };
}
