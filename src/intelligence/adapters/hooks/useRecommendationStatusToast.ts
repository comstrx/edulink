/**
 * useRecommendationStatusToast — Shared Status Transition Toast
 *
 * Tracks recommendation status changes and shows toast notifications
 * when status transitions occur (new→in_progress, in_progress→completed).
 *
 * Extracted from RecommendationsCard + GrowthActionsCard to eliminate duplication.
 */

import { useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import type { UIRecommendation } from "../unified-recommendations.adapter";
import { formatRecommendationTitle } from "../recommendation-presentation.constants";

export function useRecommendationStatusToast(recommendations: UIRecommendation[]) {
  const prevStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const prev = prevStatusRef.current;
    const next: Record<string, string> = {};
    for (const rec of recommendations) {
      next[rec.id] = rec.status;
      const oldStatus = prev[rec.id];
      if (oldStatus && oldStatus !== rec.status) {
        if (oldStatus === "new" && rec.status === "in_progress") {
          toast({ title: "✨ Started", description: formatRecommendationTitle(rec.title) });
        } else if (oldStatus === "in_progress" && rec.status === "completed") {
          const desc = rec.pathwayContext?.isPathway
            ? "Step completed in your learning journey"
            : formatRecommendationTitle(rec.title);
          toast({ title: "✅ Completed", description: desc });
        }
      }
    }
    prevStatusRef.current = next;
  }, [recommendations]);
}
