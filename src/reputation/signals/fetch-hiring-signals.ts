/**
 * Hiring Outcome Signal Fetcher — Reputation Graph Layer
 *
 * Reads applications table for outcome signals.
 * Sensitive data stays private — only aggregated counts exposed.
 */

import { supabase } from "@/integrations/supabase/client";
import type { HiringOutcomeSignals } from "../types/reputation-graph.types";

export async function fetchHiringSignals(
  teacherProfileId: string
): Promise<HiringOutcomeSignals> {
  const { data } = await supabase
    .from("applications")
    .select("status")
    .eq("teacher_id", teacherProfileId);

  const apps = data ?? [];

  return {
    shortlistedCount: apps.filter((a) => a.status === "shortlisted").length,
    interviewedCount: apps.filter(
      (a) => a.status === "interview" || a.status === "offer"
    ).length,
    hiredCount: apps.filter((a) => a.status === "hired").length,
  };
}
