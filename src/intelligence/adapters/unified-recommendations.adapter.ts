/**
 * Unified Recommendation Adapter
 *
 * Maps both snapshot-based and growth-based recommendations
 * into a single UI-ready shape. Pure mapping only.
 *
 * Product Phase — Step 1: Growth Recommendations Productization
 */

import type { RecommendationItem } from "@/intelligence/recommendations/engine/recommendation-engine.types";
import type { GrowthRecommendationEntry } from "@/growth/hooks/useGrowthRecommendations";
import { generateEntryTraceId } from "@/intelligence/observability/trace-governance";

// ── Unified UI Shape ──────────────────────────────────────────

export type UIRecommendationSource = "snapshot" | "growth";
export type UIRecommendationPriority = "high" | "medium" | "low";
export type UIRecommendationStatus = "new" | "in_progress" | "completed";

export interface UIPathwayContext {
  isPathway: boolean;
  pathwayId?: string;
  /** The training_items.type of the recommended item (course | pathway) */
  itemType?: string;
}

export interface UIRecommendation {
  id: string;
  source: UIRecommendationSource;
  title: string;
  reason?: string;
  priority: UIRecommendationPriority;
  status: UIRecommendationStatus;
  actionType: string;
  targetId?: string;
  traceId?: string;
  pathwayContext?: UIPathwayContext;
  /** Engine-assigned grouping key (e.g. training_actions, evidence_actions) */
  groupKey?: string;
  /** Engine confidence level */
  confidence?: string;
  /** Derived from status === "completed" */
  isCompleted: boolean;
  /** Raw reason codes from engine */
  reasonCodes: string[];
}

// ── Snapshot → UI ─────────────────────────────────────────────

function mapSnapshotPriority(p: string): UIRecommendationPriority {
  if (p === "critical" || p === "high") return "high";
  if (p === "medium") return "medium";
  return "low";
}

const EMPTY_TITLE_FALLBACK = "Recommended action";

function safeTitleFallback(title: string | undefined | null): string {
  return title && title.trim().length > 0 ? title : EMPTY_TITLE_FALLBACK;
}

export function mapSnapshotToUI(
  item: RecommendationItem,
  statusOverride?: UIRecommendationStatus,
): UIRecommendation {
  const status = statusOverride ?? "new";
  return {
    id: item.recommendationId,
    source: "snapshot",
    title: safeTitleFallback(item.actionLabelKey),
    reason: item.reasonCodes[0],
    priority: mapSnapshotPriority(item.priority),
    status,
    actionType: item.recommendationType,
    targetId: item.targetId,
    traceId: generateEntryTraceId("rec-snap"),
    groupKey: item.groupKey,
    confidence: item.confidence,
    isCompleted: status === "completed",
    reasonCodes: item.reasonCodes,
  };
}

// ── Growth → UI ───────────────────────────────────────────────

function mapGrowthPriority(score: number): UIRecommendationPriority {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function mapGrowthStatus(status: string): UIRecommendationStatus {
  if (status === "completed") return "completed";
  if (status === "active") return "new";
  return "in_progress";
}

function resolveGrowthGroupKey(actionType: string): string | undefined {
  if (
    actionType === "enroll_course" ||
    actionType === "start_pathway" ||
    actionType === "continue_pathway" ||
    actionType === "complete_missing_course"
  ) return "training_actions";
  if (
    actionType === "submit_evidence" ||
    actionType === "revise_evidence"
  ) return "evidence_actions";
  if (
    actionType === "pursue_credential" ||
    actionType === "request_mentor_validation"
  ) return "certification_actions";
  return undefined;
}

export function mapGrowthToUI(
  entry: GrowthRecommendationEntry,
  statusOverride?: UIRecommendationStatus,
): UIRecommendation {
  const status = statusOverride ?? mapGrowthStatus(entry.status);
  return {
    id: entry.id,
    source: "growth",
    title: safeTitleFallback(entry.actionLabel),
    reason: entry.reason || undefined,
    priority: mapGrowthPriority(entry.priorityScore),
    status,
    actionType: entry.actionType,
    targetId: entry.recommendedItemId ?? undefined,
    traceId: generateEntryTraceId("rec-growth"),
    groupKey: resolveGrowthGroupKey(entry.actionType),
    confidence: undefined,
    isCompleted: status === "completed",
    reasonCodes: entry.reason ? [entry.reason] : [],
  };
}
