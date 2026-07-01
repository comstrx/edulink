/**
 * Training Signal Fetcher — Reputation Graph Layer
 *
 * Reads training_completions, earned_credentials, pathway_executions.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TrainingEvidenceSignals } from "../types/reputation-graph.types";

export async function fetchTrainingSignals(
  teacherProfileId: string
): Promise<TrainingEvidenceSignals> {
  const [compRes, credRes, pathRes] = await Promise.all([
    supabase
      .from("training_completions")
      .select("id, verified_completion")
      .eq("teacher_id", teacherProfileId),
    supabase
      .from("earned_credentials")
      .select("credential_kind")
      .eq("teacher_id", teacherProfileId)
      .eq("status", "active"),
    supabase
      .from("pathway_executions")
      .select("id")
      .eq("teacher_id", teacherProfileId)
      .eq("status", "completed"),
  ]);

  const completions = compRes.data ?? [];
  const credentials = credRes.data ?? [];
  const pathways = pathRes.data ?? [];

  return {
    completedCourses: completions.length,
    verifiedCompletions: completions.filter((c: any) => c.verified_completion).length,
    earnedBadges: credentials.filter((c: any) => c.credential_kind === "badge").length,
    earnedCertificates: credentials.filter((c: any) => c.credential_kind === "certificate").length,
    completedPathways: pathways.length,
  };
}
