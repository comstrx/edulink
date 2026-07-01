/**
 * Talent Intelligence Refresh Service
 *
 * Orchestrates: Load → Aggregate → Persist → Emit
 * Called by the intent handler when a talent profile refresh is requested.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

import { loadTalentRawData } from "./talent-data-loader";
import { aggregateTalentIntelligence } from "./talent-intelligence-aggregator";
import { writeTalentProfile } from "./talent-profile-writer";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { dispatchDomainEvent } from "@/smart-glue/bridge";

export interface TalentRefreshResult {
  success: boolean;
  teacherId: string;
  criScore?: number;
  readinessLevel?: string;
  hiringAdvantageCount?: number;
  error?: string;
}

export async function refreshTalentProfile(
  teacherId: string,
): Promise<TalentRefreshResult> {
  try {
    // 1. Load raw signals
    const rawData = await loadTalentRawData(teacherId);

    // 2. Aggregate into profile
    const profile = aggregateTalentIntelligence(teacherId, rawData);

    // 3. Persist
    const writeResult = await writeTalentProfile(profile);
    if (!writeResult.success) {
      return { success: false, teacherId, error: writeResult.error };
    }

    // 4. Sprint 9.5-A: Single canonical path via Smart Glue
    dispatchDomainEvent("intelligence", EVENT_NAMES.intelligence.talentProfileUpdated, {
      teacherId,
      criScore: profile.criScore,
      readinessLevel: profile.readinessLevel,
      growthMomentum: profile.growthMomentum,
      hiringAdvantageCount: profile.hiringAdvantageSignals.length,
      updatedAt: profile.intelligenceUpdatedAt,
    }).catch(() => {});

    console.log("[TalentRefresh] Profile updated:", {
      teacherId,
      criScore: profile.criScore,
      readiness: profile.readinessLevel,
      advantages: profile.hiringAdvantageSignals.length,
    });

    return {
      success: true,
      teacherId,
      criScore: profile.criScore,
      readinessLevel: profile.readinessLevel,
      hiringAdvantageCount: profile.hiringAdvantageSignals.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[TalentRefresh] Error:", message);
    return { success: false, teacherId, error: message };
  }
}
