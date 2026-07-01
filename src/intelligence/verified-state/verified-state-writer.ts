/**
 * Verified State Snapshot Writer
 *
 * Persists VerifiedStateResult to intelligence_verified_state_snapshots.
 * Uses stale/fresh pattern consistent with all other snapshot writers.
 *
 * Sprint 4 — Fix 3
 */

import { supabase } from "@/integrations/supabase/client";
import type { VerifiedStateResult } from "./verified-state-engine";

export interface VerifiedStateWriteOutcome {
  success: boolean;
  error?: string;
}

export async function writeVerifiedStateSnapshot(
  result: VerifiedStateResult,
): Promise<VerifiedStateWriteOutcome> {
  const now = new Date().toISOString();

  console.log(`[VerifiedStateWriter] Writing snapshot`, {
    teacherId: result.teacherId,
    overallStatus: result.overallStatus,
    verifiedCount: result.verifiedCount,
    totalCount: result.totalCount,
  });

  // Upsert on teacher_id unique constraint — overwrites previous snapshot
  const { error } = await supabase
    .from("intelligence_verified_state_snapshots")
    .upsert([{
      teacher_id: result.teacherId,
      overall_status: result.overallStatus,
      verified_count: result.verifiedCount,
      total_count: result.totalCount,
      credentials: JSON.parse(JSON.stringify(result.credentials)),
      staleness: "fresh",
      engine_version: result.engineVersion,
      computed_at: result.computedAt,
      updated_at: now,
    }], { onConflict: "teacher_id" });

  if (error) {
    console.error(`[VerifiedStateWriter] Failed to write snapshot:`, error.message);
    return { success: false, error: error.message };
  }

  console.log(`[VerifiedStateWriter] Snapshot written successfully`);
  return { success: true };
}
