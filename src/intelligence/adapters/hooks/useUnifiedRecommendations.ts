/**
 * useUnifiedRecommendations — Unified Recommendations Hook
 *
 * Merges snapshot-based and growth-based recommendations
 * with priority sorting, deduplication (snapshot wins),
 * and real execution status from training enrollments.
 *
 * Product Phase — Step 2 + Step 6: Status Wiring
 * Sprint 8: Variant assignment wiring
 * Sprint 9: User segmentation + personalization
 */

import { useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTeacherRecommendationsSnapshot } from "@/intelligence/consumption/hooks/useTeacherRecommendationsSnapshot";
import { useGrowthRecommendations } from "@/growth/hooks/useGrowthRecommendations";
import { mapSnapshotToUI, mapGrowthToUI } from "../unified-recommendations.adapter";
import { fetchRecommendationStatuses } from "../helpers/fetchRecommendationStatuses";
import { fetchPathwayContext } from "../helpers/fetchPathwayContext";
import { getRecommendationsOrchestrated } from "@/intelligence/recommendations/orchestrator/recommendation-orchestrator";
import { setActiveVariant, setActiveSegment } from "@/intelligence/recommendations/policy/recommendation-policy.config";
import { useTalentIntelligenceProfile } from "@/intelligence/talent/hooks/useTalentIntelligenceProfile";
import { classifyUserSegment, type UserSegment, type SegmentClassification } from "@/intelligence/recommendations/personalization";
import { getSegmentMessaging, type SegmentMessaging } from "@/intelligence/recommendations/personalization";
import type { UIRecommendation, UIRecommendationStatus, UIPathwayContext } from "../unified-recommendations.adapter";
import type { RecommendationItem } from "@/intelligence/recommendations/engine/recommendation-engine.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UnifiedRecommendationsResult {
  /** Surface-capped list (max N, M/group) — use for Dashboard */
  recommendations: UIRecommendation[];
  /** Full sequenced list (no caps) — use for Recommendations page */
  allRecommendations: UIRecommendation[];
  isLoading: boolean;
  error: string | null;
  /** Sprint 9: User segment classification */
  segment: UserSegment;
  segmentClassification: SegmentClassification;
  /** Sprint 9: Segment-specific messaging */
  messaging: SegmentMessaging;
}

export function useUnifiedRecommendations(
  teacherId?: string,
): UnifiedRecommendationsResult {
  // Sprint 8: Assign A/B variant once per user (stable, deterministic)
  const variantAssigned = useRef(false);
  useEffect(() => {
    if (teacherId && !variantAssigned.current) {
      setActiveVariant(teacherId);
      variantAssigned.current = true;
    }
  }, [teacherId]);

  // Sprint 9: Fetch talent profile for segmentation
  const talentProfileResult = useTalentIntelligenceProfile(teacherId);

  // Sprint 9: Classify user segment based on talent profile
  const segmentClassification = useMemo(() => {
    return classifyUserSegment(talentProfileResult.data ?? null);
  }, [talentProfileResult.data]);

  // Sprint 9: Apply segment to config (once stable)
  const segmentApplied = useRef<UserSegment | null>(null);
  useEffect(() => {
    if (segmentClassification.segment !== segmentApplied.current) {
      setActiveSegment(segmentClassification.segment);
      segmentApplied.current = segmentClassification.segment;
      if (import.meta.env.DEV) {
        console.log(
          `[Personalization] segment=${segmentClassification.segment} confidence=${segmentClassification.confidence} signals=[${segmentClassification.signals.join(", ")}]`,
        );
      }
    }
  }, [segmentClassification]);

  const messaging = useMemo(
    () => getSegmentMessaging(segmentClassification.segment),
    [segmentClassification.segment],
  );

  const snapshotResult = useTeacherRecommendationsSnapshot(teacherId);
  const growthResult = useGrowthRecommendations(teacherId);

  // Collect all targetIds from both sources for status lookup
  const allTargetIds = useMemo(() => {
    const snapshotIds = (snapshotResult.data?.recommendations ?? [])
      .map((r) => r.targetId)
      .filter((id): id is string => !!id && UUID_RE.test(id));
    const growthIds = growthResult.recommendations
      .map((r) => r.recommendedItemId)
      .filter((id): id is string => !!id && UUID_RE.test(id));
    return [...new Set([...snapshotIds, ...growthIds])];
  }, [snapshotResult.data, growthResult.recommendations]);

  // Fetch real enrollment statuses and pathway context for all targetIds
  const statusQuery = useQuery({
    queryKey: ["recommendation_statuses", teacherId, allTargetIds],
    queryFn: () => fetchRecommendationStatuses(teacherId!, allTargetIds),
    enabled: !!teacherId && allTargetIds.length > 0,
  });

  const pathwayQuery = useQuery({
    queryKey: ["recommendation_pathway_context", allTargetIds],
    queryFn: () => fetchPathwayContext(allTargetIds),
    enabled: allTargetIds.length > 0,
  });

  const statusMap = statusQuery.data ?? {};
  const pathwayMap = pathwayQuery.data ?? {};

  const { allRecommendations, recommendations } = useMemo(() => {
    const snapshotMapped: UIRecommendation[] = (
      snapshotResult.data?.recommendations ?? []
    ).map((rec) => {
      const statusOverride: UIRecommendationStatus | undefined =
        rec.targetId ? statusMap[rec.targetId] : undefined;
      const mapped = mapSnapshotToUI(
        {
          recommendationId: rec.recommendationId,
          recommendationType: rec.type as RecommendationItem["recommendationType"],
          targetId: rec.targetId,
          priority: rec.priority as RecommendationItem["priority"],
          confidence: rec.confidence as RecommendationItem["confidence"],
          reasonCodes: rec.reasonCodes,
          relatedGapIds: rec.relatedGapIds,
          relatedTaxonomyTermIds: [],
          actionLabelKey: rec.actionLabelKey,
          groupKey: rec.groupKey as RecommendationItem["groupKey"],
        },
        statusOverride,
      );
      if (rec.targetId && pathwayMap[rec.targetId]) {
        mapped.pathwayContext = pathwayMap[rec.targetId];
      }
      return mapped;
    });

    const growthMapped: UIRecommendation[] = growthResult.recommendations.map((entry) => {
      const statusOverride: UIRecommendationStatus | undefined =
        entry.recommendedItemId ? statusMap[entry.recommendedItemId] : undefined;
      const mapped = mapGrowthToUI(entry, statusOverride);
      if (entry.recommendedItemId && pathwayMap[entry.recommendedItemId]) {
        mapped.pathwayContext = pathwayMap[entry.recommendedItemId];
      }
      return mapped;
    });

    // Orchestrator: policy core + exposure in one call
    // Config is already personalized via setActiveSegment
    const { full, exposed } = getRecommendationsOrchestrated({
      snapshotMapped,
      growthMapped,
    });

    return { allRecommendations: full, recommendations: exposed };
  }, [snapshotResult.data, growthResult.recommendations, statusMap, pathwayMap]);

  const isLoading =
    snapshotResult.status === "loading" ||
    growthResult.isLoading ||
    statusQuery.isLoading ||
    pathwayQuery.isLoading;
  const error = snapshotResult.error ?? growthResult.error ?? null;

  return {
    recommendations,
    allRecommendations,
    isLoading,
    error,
    segment: segmentClassification.segment,
    segmentClassification,
    messaging,
  };
}
