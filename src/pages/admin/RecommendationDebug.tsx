/**
 * Recommendation Debug View — Sprint 7
 *
 * Internal admin-only page for inspecting recommendation decisions.
 * Reads from existing trace-collector and useUnifiedRecommendations.
 * Visualization only — NO logic changes, NO recomputation.
 */

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUnifiedRecommendations } from "@/intelligence/adapters/hooks/useUnifiedRecommendations";
import { useAuth } from "@/contexts/AuthContext";
import { collectTrace, getStoredTraceIds } from "@/intelligence/observability/inspection/trace-collector";
import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";
import type { TelemetryEvent } from "@/intelligence/observability/telemetry.types";

// ── Helpers ───────────────────────────────────────────────────

function getSuppressedItems(
  full: UIRecommendation[],
  exposed: UIRecommendation[],
): UIRecommendation[] {
  const exposedIds = new Set(exposed.map((r) => r.id));
  return full.filter((r) => !exposedIds.has(r.id));
}

function getTraceEventsForRec(rec: UIRecommendation): TelemetryEvent[] {
  if (!rec.traceId) return [];
  return collectTrace(rec.traceId);
}

const STAGE_ORDER = ["dedup", "suppression", "sequencing", "exposure"];
const STAGE_COLORS: Record<string, string> = {
  dedup: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  suppression: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  sequencing: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  exposure: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  output: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

// ── Sub-Components ────────────────────────────────────────────

function SummaryBar({
  full,
  exposed,
  suppressed,
  traceCount,
}: {
  full: number;
  exposed: number;
  suppressed: number;
  traceCount: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Full List", value: full, color: "text-foreground" },
        { label: "Exposed", value: exposed, color: "text-green-600 dark:text-green-400" },
        { label: "Suppressed", value: suppressed, color: "text-red-600 dark:text-red-400" },
        { label: "Trace IDs", value: traceCount, color: "text-blue-600 dark:text-blue-400" },
      ].map((s) => (
        <Card key={s.label}>
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecRow({
  rec,
  index,
  isSelected,
  onSelect,
  badge,
}: {
  rec: UIRecommendation;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md border text-xs font-mono transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-border hover:bg-muted/30",
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-muted-foreground w-5 text-right shrink-0">#{index + 1}</span>
        <span className="font-semibold text-foreground truncate max-w-[200px]">{rec.title}</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1">{rec.actionType}</Badge>
        <Badge variant="outline" className="text-[9px] h-4 px-1">{rec.priority}</Badge>
        <Badge variant="outline" className="text-[9px] h-4 px-1">{rec.source}</Badge>
        <Badge variant="outline" className="text-[9px] h-4 px-1">{rec.status}</Badge>
        {badge && (
          <Badge className="text-[9px] h-4 px-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0">
            {badge}
          </Badge>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5 pl-7">
        traceId: {rec.traceId ?? "—"} | targetId: {rec.targetId ?? "—"} | groupKey: {rec.groupKey ?? "—"}
      </div>
    </button>
  );
}

function DecisionTimeline({ rec }: { rec: UIRecommendation }) {
  const events = getTraceEventsForRec(rec);

  // Group events by stage from metadata
  const stageEvents = useMemo(() => {
    const grouped: Record<string, TelemetryEvent[]> = {};
    for (const evt of events) {
      const stage = (evt.metadata?.stage as string) ?? evt.stage ?? "unknown";
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(evt);
    }
    // Sort by STAGE_ORDER, then remaining
    const ordered: { stage: string; events: TelemetryEvent[] }[] = [];
    for (const s of STAGE_ORDER) {
      if (grouped[s]) ordered.push({ stage: s, events: grouped[s] });
    }
    for (const [s, evts] of Object.entries(grouped)) {
      if (!STAGE_ORDER.includes(s)) ordered.push({ stage: s, events: evts });
    }
    return ordered;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic p-4">
        No trace events found for traceId: {rec.traceId ?? "none"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">
        Decision Timeline — {rec.title}
      </p>
      <p className="text-[10px] text-muted-foreground font-mono">
        traceId: {rec.traceId}
      </p>

      <div className="space-y-1.5">
        {stageEvents.map(({ stage, events: stageEvts }) => (
          <div
            key={stage}
            className="rounded-md border border-border/50 overflow-hidden"
          >
            <div className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider", STAGE_COLORS[stage] ?? "bg-muted text-muted-foreground")}>
              {stage}
            </div>
            <div className="divide-y divide-border/30">
              {stageEvts.map((evt, i) => (
                <div key={i} className="px-3 py-2 text-[10px] font-mono space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground font-semibold">
                      {(evt.metadata?.decision as string) ?? evt.outcome ?? "—"}
                    </span>
                    {evt.metadata?.reason && (
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                        {evt.metadata.reason as string}
                      </Badge>
                    )}
                    {evt.metadata?.index !== undefined && (
                      <span className="text-muted-foreground">pos: {evt.metadata.index as number}</span>
                    )}
                    {evt.metadata?.priority && (
                      <span className="text-muted-foreground">priority: {evt.metadata.priority as string}</span>
                    )}
                  </div>
                  <details className="cursor-pointer">
                    <summary className="text-muted-foreground hover:text-foreground">raw JSON</summary>
                    <pre className="mt-1 p-2 bg-muted/50 rounded text-[9px] overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(evt, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Full recommendation data */}
      <details className="cursor-pointer mt-2">
        <summary className="text-[10px] text-muted-foreground hover:text-foreground font-mono">
          Full UIRecommendation JSON
        </summary>
        <pre className="mt-1 p-3 bg-muted/50 rounded text-[9px] font-mono overflow-x-auto whitespace-pre-wrap break-all border border-border/30">
          {JSON.stringify(rec, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function RecommendationDebug() {
  const { user } = useAuth();
  const { recommendations: exposed, allRecommendations: full, isLoading } = useUnifiedRecommendations(user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"full" | "exposed" | "suppressed">("full");

  const suppressed = useMemo(() => getSuppressedItems(full, exposed), [full, exposed]);
  const storedTraceIds = useMemo(() => getStoredTraceIds(), [full]);

  const selectedRec = useMemo(
    () => full.find((r) => r.id === selectedId),
    [full, selectedId],
  );

  // Determine suppression reason from traces
  const suppressionReasons = useMemo(() => {
    const map: Record<string, string> = {};
    for (const rec of suppressed) {
      const events = getTraceEventsForRec(rec);
      const dropEvent = events.find(
        (e) =>
          (e.metadata?.decision === "dropped" || e.metadata?.decision === "suppressed"),
      );
      map[rec.id] = dropEvent
        ? `${(dropEvent.metadata?.stage as string) ?? "unknown"}: ${(dropEvent.metadata?.reason as string) ?? (dropEvent.metadata?.decision as string) ?? "unknown"}`
        : "exposure_cap (no trace)";
    }
    return map;
  }, [suppressed]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <h1 className="text-lg font-bold text-foreground">Recommendation Debug</h1>
        <p className="text-sm text-muted-foreground">Loading recommendations…</p>
      </div>
    );
  }

  const listMap = {
    full,
    exposed,
    suppressed,
  };
  const currentList = listMap[activeTab];

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground font-mono">🔍 Recommendation Debug</h1>
        <p className="text-xs text-muted-foreground">
          Internal view — reads from trace-collector &amp; orchestrator output. No logic executed here.
        </p>
      </div>

      {/* Summary */}
      <SummaryBar
        full={full.length}
        exposed={exposed.length}
        suppressed={suppressed.length}
        traceCount={storedTraceIds.length}
      />

      {/* Tabs + Detail split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: List */}
        <Card>
          <CardContent className="p-3 space-y-2">
            {/* Tab buttons */}
            <div className="flex gap-1">
              {(["full", "exposed", "suppressed"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setActiveTab(tab); setSelectedId(null); }}
                  className={cn(
                    "px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wide transition-colors",
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {tab} ({listMap[tab].length})
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {currentList.length === 0 && (
                <p className="text-xs text-muted-foreground italic p-2">No items in this list.</p>
              )}
              {currentList.map((rec, i) => (
                <RecRow
                  key={rec.id}
                  rec={rec}
                  index={i}
                  isSelected={selectedId === rec.id}
                  onSelect={() => setSelectedId(rec.id === selectedId ? null : rec.id)}
                  badge={activeTab === "suppressed" ? suppressionReasons[rec.id] : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Decision Timeline */}
        <Card>
          <CardContent className="p-3">
            {selectedRec ? (
              <DecisionTimeline rec={selectedRec} />
            ) : (
              <div className="text-xs text-muted-foreground italic p-4 text-center">
                ← Select a recommendation to view its decision timeline
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
