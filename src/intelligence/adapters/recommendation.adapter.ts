/**
 * Recommendation Action Adapter
 *
 * Converts TeacherRecommendationsSnapshot → ActionableRecommendations.
 * No recomputation. Pure mapping only.
 * Priority, actionType, and grouping come pre-computed from the engine.
 *
 * Step 10C — Intelligence Injection Layer
 */

import type { TeacherRecommendationsSnapshot, RecommendationEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { ActionableRecommendation, ActionableRecommendations } from "./types/adapter-signals.types";

function entryToActionType(entry: RecommendationEntry): ActionableRecommendation["actionType"] {
  switch (entry.type) {
    case "training":
    case "pathway": return "training";
    case "mentor": return "profile";
    case "job": return "career";
    default: return "profile";
  }
}

function mapEntry(entry: RecommendationEntry): ActionableRecommendation {
  return {
    actionType: entryToActionType(entry),
    targetResourceId: entry.itemId,
    priority: entry.priority,
    reasonCodes: entry.reasonCodes,
  };
}

export function adaptRecommendationToSignal(
  snapshot: TeacherRecommendationsSnapshot | null,
): ActionableRecommendations | null {
  if (!snapshot) return null;

  const all = snapshot.recommendations.map(mapEntry);

  return {
    priorityActions: all.filter((a) => a.priority === "critical" || a.priority === "high"),
    trainingActions: all.filter((a) => a.actionType === "training"),
    profileActions: all.filter((a) => a.actionType === "profile"),
    verificationActions: all.filter((a) => a.actionType === "verification"),
    totalCount: snapshot.totalCount,
  };
}
