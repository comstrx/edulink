/**
 * Reputation Event Handler — Sprint 8B
 *
 * Converts domain events into reputation events, persists them,
 * then recomputes the reputation profile snapshot.
 *
 * Pipeline: Domain Event → Reputation Event → Profile Refresh
 */

import { supabase } from "@/integrations/supabase/client";
import type { ReputationDimension } from "../types/reputation.types";
import { REPUTATION_WEIGHTS } from "./reputation-weights";
import { computeReputationTier } from "./reputation-tier-engine";
import { ALL_DIMENSIONS } from "./reputation-weights";
import {
  insertReputationEvent,
  fetchReputationEvents,
  upsertReputationProfile,
} from "@/lib/supabase-typed-queries";

export interface ReputationEventCommand {
  teacherId: string;
  eventType: string;
  sourceDomain: string;
  sourceReferenceId?: string;
}

export interface ReputationRefreshResult {
  teacherId: string;
  eventsInserted: number;
  newScore: number;
  newTier: string;
  success: boolean;
  error?: string;
}

/**
 * Process a reputation-generating domain event:
 * 1. Look up weight config
 * 2. Insert reputation_event
 * 3. Recompute reputation_profile
 */
export async function processReputationEvent(
  cmd: ReputationEventCommand
): Promise<ReputationRefreshResult> {
  const weight = REPUTATION_WEIGHTS[cmd.eventType];
  if (!weight) {
    return {
      teacherId: cmd.teacherId,
      eventsInserted: 0,
      newScore: 0,
      newTier: "emerging",
      success: false,
      error: `Unknown reputation event type: ${cmd.eventType}`,
    };
  }

  try {
    // 1. Insert reputation event
    await insertReputationEvent({
      teacher_id: cmd.teacherId,
      event_type: weight.eventType,
      source_domain: cmd.sourceDomain,
      source_reference_id: cmd.sourceReferenceId ?? null,
      reputation_delta: weight.delta,
      dimension: weight.dimension,
      description: weight.description,
    });

    // 2. Recompute profile from all events
    const result = await refreshReputationProfile(cmd.teacherId);
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      teacherId: cmd.teacherId,
      eventsInserted: 0,
      newScore: 0,
      newTier: "emerging",
      success: false,
      error: message,
    };
  }
}

/**
 * Recompute reputation profile from all reputation_events for a teacher.
 */
export async function refreshReputationProfile(
  teacherId: string
): Promise<ReputationRefreshResult> {
  try {
    // Load all events
    const allEvents = await fetchReputationEvents(teacherId);

    // Aggregate
    const dimensionScores: Record<string, number> = {};
    for (const d of ALL_DIMENSIONS) dimensionScores[d] = 0;

    let totalScore = 0;
    let verifiedCount = 0;

    for (const evt of allEvents) {
      const delta = evt.reputation_delta ?? 0;
      totalScore += delta;
      dimensionScores[evt.dimension] = (dimensionScores[evt.dimension] ?? 0) + delta;
      verifiedCount++;
    }

    const tier = computeReputationTier({
      reputationScore: totalScore,
      dimensionScores,
      verifiedSignalCount: verifiedCount,
    });

    // Upsert profile
    await upsertReputationProfile({
      teacher_id: teacherId,
      reputation_score: totalScore,
      credibility_tier: tier,
      dimension_scores: dimensionScores,
      total_reputation_events: allEvents.length,
      verified_signal_count: verifiedCount,
      updated_at: new Date().toISOString(),
    });

    return {
      teacherId,
      eventsInserted: 1,
      newScore: totalScore,
      newTier: tier,
      success: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      teacherId,
      eventsInserted: 0,
      newScore: 0,
      newTier: "emerging",
      success: false,
      error: message,
    };
  }
}
